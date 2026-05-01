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
  if (!input.document || !input.selectedElement || !input.selectedPageId || !input.value.trim()) {
    return { ok: false, reason: "not-applicable" };
  }

  const nextDocument = structuredClone(input.document) as CelionEbookDocument;
  const page = nextDocument.pages.find((item) => item.id === input.selectedPageId);
  if (!page) return { ok: false, reason: "not-applicable" };

  const selector = `[data-celion-page="${page.id}"] ${input.selectedElement.selector}`;
  if (selector.includes("runtime-text:")) return { ok: false, reason: "not-applicable" };

  const rule = `${selector} { ${cssPropertyName(input.prop)}: ${input.value}; }`;
  page.css = page.css.trim() ? `${page.css.trim()}\n${rule}` : rule;
  page.version += 1;

  return { ok: true, value: nextDocument };
}
