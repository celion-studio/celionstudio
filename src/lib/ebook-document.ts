import { normalizeEbookHtmlSlideContract, sanitizeEbookHtmlForCanvas } from "./ebook-html";
import { EBOOK_PAGE_SIZE_MM, EBOOK_PAGE_SIZE_PX } from "./ebook-format";

export type CelionEditableProp =
  | "text"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "textAlign"
  | "color"
  | "backgroundColor"
  | "opacity"
  | "borderColor"
  | "borderWidth"
  | "borderRadius"
  | "margin"
  | "padding";

export type CelionEditableElement = {
  id: string;
  role: string;
  type: "text" | "shape" | "image" | "container";
  selector: string;
  label: string;
  editableProps: CelionEditableProp[];
  maxLength?: number;
};

export type CelionPageManifest = {
  editableElements: CelionEditableElement[];
};

export type CelionEbookPage = {
  id: string;
  index: number;
  title: string;
  role: string;
  html: string;
  css: string;
  manifest: CelionPageManifest;
  version: number;
};

export type CelionEbookDocument = {
  version: 1;
  title: string;
  size: { width: number; height: number; unit: "px" };
  themeCss: string;
  pages: CelionEbookPage[];
};

export type EbookDocumentValidation = {
  ok: boolean;
  errors: string[];
};

const EDITABLE_PROPS = new Set<CelionEditableProp>([
  "text",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "color",
  "backgroundColor",
  "opacity",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "margin",
  "padding",
]);
const EDITABLE_TYPES = new Set<CelionEditableElement["type"]>(["text", "shape", "image", "container"]);
const FORBIDDEN_TAGS = ["script", "iframe", "object", "embed", "form", "input", "textarea", "button", "video", "audio", "style", "link"];
const SAFE_BLOCK_AT_RULES = new Set(["media", "supports", "container"]);
const UNSAFE_CSS_TOKENS = /<\/?style\b|<|>|url\s*\(/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeEditableProps(value: unknown): CelionEditableProp[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CelionEditableProp => typeof item === "string" && EDITABLE_PROPS.has(item as CelionEditableProp));
}

function normalizeEditableElement(value: unknown): CelionEditableElement {
  const input = isRecord(value) ? value : {};
  const type = typeof input.type === "string" && EDITABLE_TYPES.has(input.type as CelionEditableElement["type"])
    ? input.type as CelionEditableElement["type"]
    : "text";
  const element: CelionEditableElement = {
    id: normalizeString(input.id),
    role: normalizeString(input.role),
    type,
    selector: normalizeString(input.selector),
    label: normalizeString(input.label),
    editableProps: normalizeEditableProps(input.editableProps),
  };

  if (typeof input.maxLength === "number" && Number.isFinite(input.maxLength)) {
    element.maxLength = input.maxLength;
  }

  return element;
}

function normalizeManifest(value: unknown): CelionPageManifest {
  const input = isRecord(value) ? value : {};
  return {
    editableElements: Array.isArray(input.editableElements)
      ? input.editableElements.map(normalizeEditableElement)
      : [],
  };
}

function normalizePage(value: unknown, index: number): CelionEbookPage {
  const input = isRecord(value) ? value : {};
  const id = normalizeString(input.id, `page-${index + 1}`) || `page-${index + 1}`;

  return {
    id,
    index: normalizeNumber(input.index, index),
    title: normalizeString(input.title, `Page ${index + 1}`),
    role: normalizeString(input.role, "page"),
    html: normalizeString(input.html),
    css: normalizeString(input.css),
    manifest: normalizeManifest(input.manifest),
    version: normalizeNumber(input.version, 1),
  };
}

export function normalizeEbookDocument(input: unknown): CelionEbookDocument {
  const value = isRecord(input) ? input : {};
  const size = isRecord(value.size) ? value.size : {};

  return {
    version: 1,
    title: normalizeString(value.title),
    size: {
      width: normalizeNumber(size.width, EBOOK_PAGE_SIZE_PX.width),
      height: normalizeNumber(size.height, EBOOK_PAGE_SIZE_PX.height),
      unit: "px",
    },
    themeCss: normalizeString(value.themeCss),
    pages: Array.isArray(value.pages) ? value.pages.map(normalizePage) : [],
  };
}

function hasForbiddenTag(html: string) {
  return FORBIDDEN_TAGS.find((tag) => new RegExp(`<\\s*${tag}(?:\\s|>|/)`, "i").test(html));
}

function manifestIds(page: CelionEbookPage) {
  return page.manifest.editableElements.map((element) => element.id).filter(Boolean);
}

function htmlEditableIds(html: string) {
  return [...html.matchAll(/\sdata-celion-id\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
    .filter(Boolean);
}

function attributeValue(attrs: string, name: string) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "i");
  const match = attrs.match(pattern);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function editableTypeFromTagAndRole(tag: string, role: string): CelionEditableElement["type"] {
  const normalizedRole = role.toLowerCase();
  if (tag.toLowerCase() === "img" || normalizedRole.includes("image")) return "image";
  if (normalizedRole.includes("shape") || normalizedRole.includes("decorative")) return "shape";
  if (normalizedRole.includes("container") || normalizedRole.includes("group")) return "container";
  return "text";
}

function labelFromIdAndRole(id: string, role: string) {
  const base = role || id;
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function editablePropsForType(type: CelionEditableElement["type"]): CelionEditableProp[] {
  if (type === "image") return ["opacity", "borderRadius", "margin"];
  if (type === "shape" || type === "container") return ["backgroundColor", "opacity", "borderColor", "borderWidth", "borderRadius", "margin", "padding"];
  return ["text", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "color"];
}

function htmlEditableElements(html: string): CelionEditableElement[] {
  const elements: CelionEditableElement[] = [];
  const elementPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;

  for (const match of html.matchAll(elementPattern)) {
    const tag = match[1] ?? "";
    const attrs = match[2] ?? "";
    const id = attributeValue(attrs, "data-celion-id");
    if (!id) continue;

    const role = attributeValue(attrs, "data-role") || "text";
    const type = editableTypeFromTagAndRole(tag, role);
    const element: CelionEditableElement = {
      id,
      role,
      type,
      selector: `[data-celion-id="${id}"]`,
      label: labelFromIdAndRole(id, role),
      editableProps: editablePropsForType(type),
    };

    if (type === "text") element.maxLength = 240;
    elements.push(element);
  }

  return elements;
}

function repairManifestFromHtml(page: CelionEbookPage): CelionPageManifest {
  const editableElements = htmlEditableElements(page.html);
  const existingElementsById = new Map(page.manifest.editableElements.map((element) => [element.id, element]));
  const nextElements: CelionEditableElement[] = [];

  for (const htmlElement of editableElements) {
    const existingElement = existingElementsById.get(htmlElement.id);
    nextElements.push(existingElement
      ? {
          ...htmlElement,
          ...existingElement,
          selector: `[data-celion-id="${htmlElement.id}"]`,
          label: existingElement.label || htmlElement.label,
          role: existingElement.role || htmlElement.role,
          editableProps: existingElement.editableProps.length > 0 ? existingElement.editableProps : htmlElement.editableProps,
        }
      : htmlElement);
  }

  return { editableElements: nextElements };
}

function stripInlineStyleAttributes(html: string) {
  return html.replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function stripCssComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function findMatchingBrace(css: string, openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function atRuleName(prelude: string) {
  return prelude.match(/^@([a-z-]+)/i)?.[1]?.toLowerCase();
}

function findCssSelectorErrors(css: string, scope: string) {
  const errors: string[] = [];
  const cleanCss = stripCssComments(css);

  if (UNSAFE_CSS_TOKENS.test(cleanCss)) {
    errors.push("CSS contains unsafe markup or url() tokens.");
  }

  const scanBlocks = (blockCss: string) => {
    let cursor = 0;

    while (cursor < blockCss.length) {
      const openIndex = blockCss.indexOf("{", cursor);
      const semicolonIndex = blockCss.indexOf(";", cursor);

      if (semicolonIndex !== -1 && (openIndex === -1 || semicolonIndex < openIndex)) {
        const statement = blockCss.slice(cursor, semicolonIndex).trim();
        const name = statement.startsWith("@") ? atRuleName(statement) : undefined;
        if (name) {
          errors.push(`Unsupported CSS at-rule @${name}.`);
        }
        cursor = semicolonIndex + 1;
        continue;
      }

      if (openIndex === -1) return;

      const prelude = blockCss.slice(cursor, openIndex).trim();
      const closeIndex = findMatchingBrace(blockCss, openIndex);
      if (closeIndex === -1) return;

      if (prelude.startsWith("@")) {
        const name = atRuleName(prelude);
        if (name && SAFE_BLOCK_AT_RULES.has(name)) {
          scanBlocks(blockCss.slice(openIndex + 1, closeIndex));
        } else {
          errors.push(`Unsupported CSS at-rule ${name ? `@${name}` : prelude}.`);
        }
      } else if (prelude) {
        const selectors = prelude.split(",").map((selector) => selector.trim()).filter(Boolean);
        const unscopedSelector = selectors.find((selector) => !selector.startsWith(scope));
        if (unscopedSelector) {
          errors.push(`CSS selector "${unscopedSelector}" must start with ${scope}.`);
        }
      }

      cursor = closeIndex + 1;
    }
  };

  scanBlocks(cleanCss);

  return errors;
}

function findThemeCssErrors(css: string) {
  const errors: string[] = [];
  const cleanCss = stripCssComments(css).trim();
  if (!cleanCss) return errors;

  if (UNSAFE_CSS_TOKENS.test(cleanCss)) {
    errors.push("Theme CSS contains unsafe markup or url() tokens.");
  }

  let cursor = 0;
  while (cursor < cleanCss.length) {
    const openIndex = cleanCss.indexOf("{", cursor);
    const semicolonIndex = cleanCss.indexOf(";", cursor);

    if (semicolonIndex !== -1 && (openIndex === -1 || semicolonIndex < openIndex)) {
      const statement = cleanCss.slice(cursor, semicolonIndex).trim();
      if (statement) errors.push("Theme CSS only supports :root custom property blocks.");
      cursor = semicolonIndex + 1;
      continue;
    }

    if (openIndex === -1) break;

    const selector = cleanCss.slice(cursor, openIndex).trim();
    const closeIndex = findMatchingBrace(cleanCss, openIndex);
    if (closeIndex === -1) {
      errors.push("Theme CSS has an unmatched block.");
      break;
    }

    if (selector !== ":root") {
      errors.push("Theme CSS only supports :root custom property blocks.");
    }

    const declarations = cleanCss.slice(openIndex + 1, closeIndex)
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean);
    for (const declaration of declarations) {
      const property = declaration.split(":")[0]?.trim() ?? "";
      if (!property.startsWith("--")) {
        errors.push("Theme CSS declarations must be CSS custom properties.");
      }
    }

    cursor = closeIndex + 1;
  }

  return errors;
}

function rawPages(input: unknown) {
  if (!isRecord(input) || !Array.isArray(input.pages)) return [];
  return input.pages;
}

function validateRawManifestEntries(input: unknown, pageIndex: number, pageId: string) {
  const errors: string[] = [];
  const rawPage = rawPages(input)[pageIndex];
  if (!isRecord(rawPage) || !isRecord(rawPage.manifest) || !Array.isArray(rawPage.manifest.editableElements)) {
    return errors;
  }

  rawPage.manifest.editableElements.forEach((entry, index) => {
    const entryNumber = index + 1;
    if (!isRecord(entry)) {
      errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} must be an object.`);
      return;
    }

    for (const field of ["id", "role", "selector", "label"] as const) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} is missing ${field}.`);
      }
    }

    if (typeof entry.type !== "string" || !EDITABLE_TYPES.has(entry.type as CelionEditableElement["type"])) {
      errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} has invalid type.`);
    }

    if (typeof entry.id === "string" && typeof entry.selector === "string") {
      const id = entry.id.trim();
      const selector = entry.selector.trim();
      if (
        id &&
        selector &&
        selector !== `[data-celion-id="${id}"]` &&
        selector !== `[data-celion-id='${id}']`
      ) {
        errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} selector must be an exact data-celion-id selector.`);
      }
    }

    if (!Array.isArray(entry.editableProps) || entry.editableProps.length === 0) {
      errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} has invalid editableProps.`);
      return;
    }

    const invalidProps = entry.editableProps.filter((item) => typeof item !== "string" || !EDITABLE_PROPS.has(item as CelionEditableProp));
    if (invalidProps.length > 0) {
      errors.push(`Page "${pageId}" manifest editable entry ${entryNumber} has invalid editableProps.`);
    }
  });

  return errors;
}

export function validateEbookDocument(input: unknown): EbookDocumentValidation {
  const document = normalizeEbookDocument(input);
  const errors: string[] = [];
  const pageIds = new Set<string>();

  errors.push(...findThemeCssErrors(document.themeCss));

  if (document.pages.length === 0) {
    errors.push("Document must include at least one page.");
  }

  for (const [pageIndex, page] of document.pages.entries()) {
    if (pageIds.has(page.id)) {
      errors.push(`Page id "${page.id}" must be unique.`);
    }
    pageIds.add(page.id);

    const pageScope = `[data-celion-page="${page.id}"]`;
    if (!page.html.includes(`data-celion-page="${page.id}"`) && !page.html.includes(`data-celion-page='${page.id}'`)) {
      errors.push(`Page "${page.id}" HTML must include matching data-celion-page.`);
    }

    const forbiddenTag = hasForbiddenTag(page.html);
    if (forbiddenTag) {
      errors.push(`Page "${page.id}" contains forbidden <${forbiddenTag}> tag.`);
    }

    if (/\son[a-z]+\s*=/i.test(page.html)) {
      errors.push(`Page "${page.id}" contains forbidden event handler attributes.`);
    }

    if (/\sstyle\s*=/i.test(page.html)) {
      errors.push(`Page "${page.id}" contains forbidden inline style attributes.`);
    }

    errors.push(...findCssSelectorErrors(page.css, pageScope).map((error) => `Page "${page.id}" ${error}`));
    errors.push(...validateRawManifestEntries(input, pageIndex, page.id));

    const editableIds = htmlEditableIds(page.html);
    const editableIdSet = new Set(editableIds);
    for (const id of duplicateValues(editableIds)) {
      errors.push(`Page "${page.id}" HTML editable id "${id}" must be unique.`);
    }

    const pageManifestIds = manifestIds(page);
    const manifestIdSet = new Set(pageManifestIds);
    for (const id of duplicateValues(pageManifestIds)) {
      errors.push(`Page "${page.id}" manifest editable id "${id}" must be unique.`);
    }

    for (const id of editableIdSet) {
      if (!manifestIdSet.has(id)) {
        errors.push(`Page "${page.id}" HTML editable id "${id}" is missing from manifest.`);
      }
    }

    for (const id of pageManifestIds) {
      if (!editableIdSet.has(id)) {
        errors.push(`Page "${page.id}" manifest editable id "${id}" was not found in HTML.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function sanitizeEbookDocument(input: unknown): CelionEbookDocument {
  const document = normalizeEbookDocument(input);
  return normalizeEbookDocument({
    ...document,
    themeCss: sanitizeEbookHtmlForCanvas(document.themeCss),
    pages: document.pages.map((page) => ({
      ...page,
      html: stripInlineStyleAttributes(sanitizeEbookHtmlForCanvas(page.html)),
      css: sanitizeEbookHtmlForCanvas(page.css),
    })).map((page) => ({
      ...page,
      manifest: repairManifestFromHtml(page),
    })),
  });
}

export function compileEbookDocumentToHtml(input: CelionEbookDocument): string {
  const document = normalizeEbookDocument(input);
  const pageCss = document.pages.map((page) => page.css).filter(Boolean).join("\n");
  const slides = document.pages
    .map((page, index) => `<div class="slide celion-page-shell" data-slide="${index + 1}" data-page-id="${page.id}">${page.html}</div>`)
    .join("\n");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: ${EBOOK_PAGE_SIZE_MM.width}mm ${EBOOK_PAGE_SIZE_MM.height}mm; margin: 0; }
    .slide {
      width: ${document.size.width}${document.size.unit};
      height: ${document.size.height}${document.size.unit};
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      position: relative;
      box-sizing: border-box;
    }
    .slide *, .slide *::before, .slide *::after {
      box-sizing: border-box;
    }
${document.themeCss}
${pageCss}
  </style>
</head>
<body>
${slides}
</body>
</html>`;

  return normalizeEbookHtmlSlideContract(sanitizeEbookHtmlForCanvas(html));
}
