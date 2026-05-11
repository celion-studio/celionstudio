import type { CelionEditableElement, CelionEbookDocument } from "@/lib/ebook-document";
import { getRuntimeTextElements, normalizeEditorHtml } from "./editor-preview";
import type { RuntimeTextSelection } from "./editor-types";

type EditResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-applicable" | "target-missing" };

type ParseHtml = (html: string) => Document;

function parseHtmlDocument(html: string) {
  if (typeof DOMParser === "undefined") {
    throw new Error("DOMParser is required to edit editor HTML.");
  }

  return new DOMParser().parseFromString(html, "text/html");
}

function cssPropertyName(prop: string) {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LAYOUT_PROPS = new Set(["transform", "width", "height"]);

function layoutMarker(pageId: string, elementId: string) {
  const safePageId = pageId.replace(/\*\//g, "").trim();
  const safeElementId = elementId.replace(/\*\//g, "").trim();
  return {
    start: `/* celion-layout:${safePageId}:${safeElementId} */`,
    end: `/* /celion-layout:${safePageId}:${safeElementId} */`,
  };
}

function parseDeclarations(value: string) {
  const declarations = new Map<string, string>();
  value.split(";").forEach((part) => {
    const [rawProp, ...rawValueParts] = part.split(":");
    const prop = rawProp?.trim();
    const declarationValue = rawValueParts.join(":").trim();
    if (!prop || !declarationValue) return;
    declarations.set(prop, declarationValue);
  });

  return declarations;
}

function formatDeclarations(declarations: Map<string, string>) {
  return Array.from(declarations)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join(" ");
}

function removeExistingLayoutRules(css: string, selector: string, markers: { start: string; end: string }) {
  const declarations = new Map<string, string>();
  let nextCss = css;

  const markerPattern = new RegExp(`\\s*${escapeRegex(markers.start)}\\s*\\n?${escapeRegex(selector)}\\s*\\{([^{}]*)\\}\\s*\\n?${escapeRegex(markers.end)}\\s*`, "g");
  nextCss = nextCss.replace(markerPattern, (_match, rawDeclarations: string) => {
    parseDeclarations(rawDeclarations).forEach((value, prop) => {
      if (LAYOUT_PROPS.has(prop)) declarations.set(prop, value);
    });
    return "\n";
  });

  const legacyRulePattern = new RegExp(`(^|\\n)\\s*${escapeRegex(selector)}\\s*\\{([^{}]*)\\}\\s*(?=\\n|$)`, "g");
  nextCss = nextCss.replace(legacyRulePattern, (match, prefix: string, rawDeclarations: string) => {
    const parsed = parseDeclarations(rawDeclarations);
    const props = Array.from(parsed.keys());
    const isLegacyLayoutRule = props.length > 0 && props.every((prop) => LAYOUT_PROPS.has(prop));
    if (!isLegacyLayoutRule) return match;

    parsed.forEach((value, prop) => declarations.set(prop, value));
    return prefix;
  });

  return {
    css: nextCss
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    declarations,
  };
}

function appendScopedDeclarationsToDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  declarations: Array<{ prop: string; value: string }>;
}): EditResult<CelionEbookDocument> {
  if (!input.document || !input.selectedElement || !input.selectedPageId) {
    return { ok: false, reason: "not-applicable" };
  }

  const declarations = input.declarations
    .map(({ prop, value }) => ({ prop: prop.trim(), value: value.trim() }))
    .filter(({ prop, value }) => prop && value);
  if (declarations.length === 0) return { ok: false, reason: "not-applicable" };

  const nextDocument = structuredClone(input.document) as CelionEbookDocument;
  const page = nextDocument.pages.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-page="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const ruleDeclarations = declarations
    .map(({ prop, value }) => `${cssPropertyName(prop)}: ${value};`)
    .join(" ");
  const rule = `${selector} { ${ruleDeclarations} }`;
  page.css = page.css.trim() ? `${page.css.trim()}\n${rule}` : rule;
  page.version += 1;

  return { ok: true, value: nextDocument };
}

function replaceScopedLayoutDeclarationsInDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  declarations: Array<{ prop: string; value: string }>;
}): EditResult<CelionEbookDocument> {
  if (!input.document || !input.selectedElement || !input.selectedPageId) {
    return { ok: false, reason: "not-applicable" };
  }

  const nextDeclarations = input.declarations
    .map(({ prop, value }) => ({ prop: cssPropertyName(prop.trim()), value: value.trim() }))
    .filter(({ prop, value }) => LAYOUT_PROPS.has(prop) && value);
  if (nextDeclarations.length === 0) return { ok: false, reason: "not-applicable" };

  const nextDocument = structuredClone(input.document) as CelionEbookDocument;
  const page = nextDocument.pages.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-page="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const markers = layoutMarker(page.id, input.selectedElement.id);
  const cleaned = removeExistingLayoutRules(page.css, selector, markers);
  const mergedDeclarations = cleaned.declarations;
  nextDeclarations.forEach(({ prop, value }) => mergedDeclarations.set(prop, value));

  const rule = `${markers.start}\n${selector} { ${formatDeclarations(mergedDeclarations)} }\n${markers.end}`;
  page.css = cleaned.css ? `${cleaned.css}\n${rule}` : rule;
  page.version += 1;

  return { ok: true, value: nextDocument };
}

export function applyDocumentTextEdit(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  selectedRuntimeText: RuntimeTextSelection | null;
  editValue: string;
  parseHtml?: ParseHtml;
}): EditResult<CelionEbookDocument> {
  const currentDocument = input.document;
  if (!currentDocument || !input.selectedPageId) return { ok: false, reason: "not-applicable" };

  const pageIndex = currentDocument.pages.findIndex((page) => page.id === input.selectedPageId);
  const page = pageIndex >= 0 ? currentDocument.pages[pageIndex] : null;
  if (!page) return { ok: false, reason: "not-applicable" };

  const doc = (input.parseHtml ?? parseHtmlDocument)(page.html);
  const target = input.selectedRuntimeText?.mode === "document"
    ? getRuntimeTextElements(doc)[input.selectedRuntimeText.textIndex]
    : input.selectedElement
      ? doc.querySelector<HTMLElement>(input.selectedElement.selector)
      : null;
  if (!target) return { ok: false, reason: "target-missing" };

  target.textContent = input.editValue.trim();

  return {
    ok: true,
    value: {
      ...currentDocument,
      pages: currentDocument.pages.map((item, index) => index === pageIndex
        ? {
            ...item,
            html: doc.body.innerHTML,
            version: item.version + 1,
          }
        : item),
    },
  };
}

export function applyLegacyHtmlTextEdit(input: {
  html: string;
  selectedSelector: string;
  editValue: string;
  parseHtml?: ParseHtml;
}): EditResult<string> {
  if (!input.selectedSelector) return { ok: false, reason: "not-applicable" };

  const doc = (input.parseHtml ?? parseHtmlDocument)(input.html);
  const [slideIndexRaw, editableIndexRaw] = input.selectedSelector.split(":");
  const slideIndex = Number(slideIndexRaw);
  const editableIndex = Number(editableIndexRaw);
  const runtimeMatch = input.selectedSelector.match(/^runtime:(\d+):(\d+)$/);
  const target = runtimeMatch
    ? getRuntimeTextElements(doc.querySelectorAll<HTMLElement>(".slide")[Number(runtimeMatch[1])])[Number(runtimeMatch[2])]
    : Number.isFinite(slideIndex) && Number.isFinite(editableIndex)
      ? doc.querySelectorAll<HTMLElement>(".slide")[slideIndex]?.querySelectorAll<HTMLElement>("[data-text-editable]")[editableIndex]
      : doc.querySelector(input.selectedSelector);

  if (!target) return { ok: false, reason: "target-missing" };

  target.textContent = input.editValue.trim();

  return {
    ok: true,
    value: normalizeEditorHtml(`<!doctype html>\n${doc.documentElement.outerHTML}`),
  };
}

export function appendScopedStyleToDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  prop: string;
  value: string;
}): EditResult<CelionEbookDocument> {
  return appendScopedDeclarationsToDocument({
    document: input.document,
    selectedPageId: input.selectedPageId,
    selectedElement: input.selectedElement,
    declarations: [{ prop: input.prop, value: input.value }],
  });
}

export function appendScopedLayoutTransformToDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  transform: string;
}): EditResult<CelionEbookDocument> {
  if (!input.document || !input.selectedElement || !input.selectedPageId || !input.transform.trim()) {
    return { ok: false, reason: "not-applicable" };
  }

  return replaceScopedLayoutDeclarationsInDocument({
    document: input.document,
    selectedPageId: input.selectedPageId,
    selectedElement: input.selectedElement,
    declarations: [{ prop: "transform", value: input.transform.trim() }],
  });
}

export function appendScopedLayoutBoxToDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
  width: string;
  height: string;
}): EditResult<CelionEbookDocument> {
  return replaceScopedLayoutDeclarationsInDocument({
    document: input.document,
    selectedPageId: input.selectedPageId,
    selectedElement: input.selectedElement,
    declarations: [
      { prop: "width", value: input.width },
      { prop: "height", value: input.height },
    ],
  });
}

export function removeScopedLayoutFromDocument(input: {
  document: CelionEbookDocument | null;
  selectedPageId: string;
  selectedElement: CelionEditableElement | null;
}): EditResult<CelionEbookDocument> {
  if (!input.document || !input.selectedElement || !input.selectedPageId) {
    return { ok: false, reason: "not-applicable" };
  }

  const nextDocument = structuredClone(input.document) as CelionEbookDocument;
  const page = nextDocument.pages.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-page="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const originalCss = page.css.trim();
  const cleaned = removeExistingLayoutRules(page.css, selector, layoutMarker(page.id, input.selectedElement.id));
  if (cleaned.css === originalCss) return { ok: false, reason: "not-applicable" };

  page.css = cleaned.css;
  page.version += 1;

  return { ok: true, value: nextDocument };
}
