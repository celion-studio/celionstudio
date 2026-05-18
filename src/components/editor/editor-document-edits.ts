import type { CelionEditableElement, CelionEbookDocument } from "@/lib/ebook-document";
import {
  MAX_EBOOK_DOCUMENT_JSON_LENGTH,
  MAX_EBOOK_PAGE_CSS_LENGTH,
  MAX_EBOOK_PAGE_HTML_LENGTH,
} from "@/lib/request-limits";
import { getRuntimeTextElements, normalizeEditorHtml } from "./editor-preview";
import {
  LAYOUT_PROPS,
  cssPropertyName,
  formatDeclarations,
  layoutMarker,
  removeExistingScopedRules,
  styleMarker,
} from "./editor-style-rules";
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

function removeExistingLayoutRules(css: string, selector: string, markers: { start: string; end: string }) {
  return removeExistingScopedRules({
    css,
    selector,
    markers,
    shouldCollectProp: (prop) => LAYOUT_PROPS.has(prop),
    shouldRemoveLegacyRule: (props) => props.length > 0 && props.every((prop) => LAYOUT_PROPS.has(prop)),
  });
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function imageIdBase(slideId: string) {
  const normalizedPageId = slideId
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    || "page";
  return `${normalizedPageId}-image`;
}

function nextImageElementId(page: CelionEbookDocument["slides"][number]) {
  const base = imageIdBase(page.id);
  const usedIds = new Set([
    ...page.manifest.editableElements.map((element) => element.id),
    ...Array.from(page.html.matchAll(/\sdata-celion-id\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi))
      .map((match) => match[1] ?? match[2] ?? match[3] ?? ""),
  ].filter(Boolean));
  let index = 1;
  let candidate = `${base}-${String(index).padStart(3, "0")}`;

  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `${base}-${String(index).padStart(3, "0")}`;
  }

  return candidate;
}

function insertBeforePageClose(html: string, fragment: string) {
  const closingSection = /<\/section>\s*$/i;
  if (closingSection.test(html)) {
    return html.replace(closingSection, `${fragment}\n</section>`);
  }

  return `${html}\n${fragment}`;
}

function isSafeEditorImageSrc(value: string) {
  return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
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
  const page = nextDocument.slides.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-slide="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const markers = styleMarker(page.id, input.selectedElement.id);
  const cleaned = removeExistingScopedRules({
    css: page.css,
    selector,
    markers,
    shouldCollectProp: (prop) => !LAYOUT_PROPS.has(prop),
    shouldRemoveLegacyRule: (props) => props.length > 0 && props.every((prop) => !LAYOUT_PROPS.has(prop)),
  });
  const mergedDeclarations = cleaned.declarations;
  declarations.forEach(({ prop, value }) => {
    mergedDeclarations.set(cssPropertyName(prop), value);
  });

  const rule = `${markers.start}\n${selector} { ${formatDeclarations(mergedDeclarations)} }\n${markers.end}`;
  page.css = cleaned.css ? `${cleaned.css}\n${rule}` : rule;
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
  const page = nextDocument.slides.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-slide="${page.id}"] ${input.selectedElement.selector}`;
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

  const slideIndex = currentDocument.slides.findIndex((page) => page.id === input.selectedPageId);
  const page = slideIndex >= 0 ? currentDocument.slides[slideIndex] : null;
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
      slides: currentDocument.slides.map((item, index) => index === slideIndex
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
  transform?: string;
}): EditResult<CelionEbookDocument> {
  return replaceScopedLayoutDeclarationsInDocument({
    document: input.document,
    selectedPageId: input.selectedPageId,
    selectedElement: input.selectedElement,
    declarations: [
      ...(input.transform?.trim() ? [{ prop: "transform", value: input.transform.trim() }] : []),
      { prop: "width", value: input.width },
      { prop: "height", value: input.height },
    ],
  });
}

export function insertImageIntoDocument(input: {
  document: CelionEbookDocument | null;
  slideIndex: number;
  src: string;
  alt: string;
}): EditResult<{ document: CelionEbookDocument; slideId: string; element: CelionEditableElement }> {
  if (!input.document || !Number.isFinite(input.slideIndex) || !isSafeEditorImageSrc(input.src)) {
    return { ok: false, reason: "not-applicable" };
  }

  const slideIndex = Math.trunc(input.slideIndex);
  const currentPage = input.document.slides[slideIndex];
  if (!currentPage) return { ok: false, reason: "not-applicable" };

  const nextDocument = structuredClone(input.document) as CelionEbookDocument;
  const page = nextDocument.slides[slideIndex];
  if (!page) return { ok: false, reason: "not-applicable" };

  const id = nextImageElementId(page);
  const element: CelionEditableElement = {
    id,
    role: "image",
    type: "image",
    selector: `[data-celion-id="${id}"]`,
    label: "Image",
    editableProps: ["opacity", "borderRadius", "margin"],
  };
  const safeSrc = escapeHtmlAttribute(input.src.trim());
  const safeAlt = escapeHtmlAttribute(input.alt.trim() || "Inserted image");
  const imageHtml = `<img class="celion-inserted-image" data-celion-id="${id}" data-role="image" data-editable="true" src="${safeSrc}" alt="${safeAlt}" />`;
  const selector = `[data-celion-slide="${page.id}"] ${element.selector}`;
  const imageCss = `${selector} { position: absolute; left: 48px; top: 96px; width: 220px; height: 160px; object-fit: cover; display: block; border-radius: 10px; }`;

  page.html = insertBeforePageClose(page.html, imageHtml);
  page.css = page.css.trim() ? `${page.css.trim()}\n${imageCss}` : imageCss;
  page.manifest = {
    editableElements: [
      ...page.manifest.editableElements,
      element,
    ],
  };
  page.version += 1;

  if (
    page.html.length > MAX_EBOOK_PAGE_HTML_LENGTH ||
    page.css.length > MAX_EBOOK_PAGE_CSS_LENGTH ||
    JSON.stringify(nextDocument).length > MAX_EBOOK_DOCUMENT_JSON_LENGTH
  ) {
    return { ok: false, reason: "not-applicable" };
  }

  return {
    ok: true,
    value: {
      document: nextDocument,
      slideId: page.id,
      element,
    },
  };
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
  const page = nextDocument.slides.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-slide="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const originalCss = page.css.trim();
  const cleaned = removeExistingLayoutRules(page.css, selector, layoutMarker(page.id, input.selectedElement.id));
  if (cleaned.css === originalCss) return { ok: false, reason: "not-applicable" };

  page.css = cleaned.css;
  page.version += 1;

  return { ok: true, value: nextDocument };
}
