import type { CelionEbookDocument } from "@/lib/ebook-document";
import { getRuntimeTextElements } from "./editor-preview";
import type { InspectorLayoutValues, InspectorStyleValues } from "./editor-types";
import { formatLayoutNumber, parseTranslate } from "./editor-layout-values";

export function getPointedElements(doc: Document, event: MouseEvent | PointerEvent, fallback: HTMLElement) {
  return typeof doc.elementsFromPoint === "function"
    ? doc.elementsFromPoint(event.clientX, event.clientY)
    : [fallback];
}

export function clearSelectedPreviewElements(doc: Document) {
  doc.querySelectorAll("[data-selected]").forEach((el) => {
    el.removeAttribute("data-selected");
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.outlineOffset = "";
  });
}

export function selectPreviewElement(doc: Document, element: Element) {
  clearSelectedPreviewElements(doc);
  element.setAttribute("data-selected", "true");
  (element as HTMLElement).style.outline = "none";
  (element as HTMLElement).style.outlineOffset = "0";
}

export function readInspectorStyleValues(doc: Document, element: HTMLElement): InspectorStyleValues {
  const styles = doc.defaultView?.getComputedStyle(element);
  if (!styles) return {};

  return {
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    textAlign: styles.textAlign,
    color: styles.color,
    backgroundColor: styles.backgroundColor,
    opacity: styles.opacity,
    borderColor: styles.borderColor,
    borderWidth: styles.borderWidth,
    borderRadius: styles.borderRadius,
    margin: styles.margin,
    padding: styles.padding,
  };
}

export function readLayoutValues(doc: Document, element: HTMLElement): InspectorLayoutValues {
  const styles = doc.defaultView?.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const translate = parseTranslate(styles?.transform ?? element.style.transform);

  return {
    x: formatLayoutNumber(translate.x),
    y: formatLayoutNumber(translate.y),
    width: formatLayoutNumber(rect.width),
    height: formatLayoutNumber(rect.height),
  };
}

export function getCandidateCelionIds(pointedElements: Element[]) {
  return pointedElements
    .map((element) => element.closest<HTMLElement>("[data-celion-id]")?.getAttribute("data-celion-id") ?? "")
    .filter((id, index, ids) => id && ids.indexOf(id) === index);
}

export function getDocumentPageContext(
  document: CelionEbookDocument,
  pointedElements: Element[],
  fallback: HTMLElement,
) {
  const pageEl = (pointedElements.find((element) => element.closest("[data-celion-page]")) ?? fallback)
    .closest<HTMLElement>("[data-celion-page]");
  const pageId = pageEl?.getAttribute("data-celion-page") ?? "";
  if (!pageId) return null;

  const pageIndex = document.pages.findIndex((page) => page.id === pageId);
  const page = pageIndex >= 0 ? document.pages[pageIndex] : null;
  if (!page) return null;

  return { page, pageEl, pageId, pageIndex };
}

export function getRuntimeTextBySelection(
  doc: Document,
  selection: { mode: "document" | "legacy"; pageId: string; pageIndex: number; textIndex: number },
) {
  if (selection.mode === "document") {
    const page = doc.querySelector<HTMLElement>(`[data-celion-page="${selection.pageId}"]`);
    return page ? getRuntimeTextElements(page)[selection.textIndex] ?? null : null;
  }

  const page = doc.querySelectorAll<HTMLElement>(".slide")[selection.pageIndex];
  return page ? getRuntimeTextElements(page)[selection.textIndex] ?? null : null;
}
