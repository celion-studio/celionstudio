import {
  applyPreviewPageSpacing,
  buildPreviewFrameCss,
  estimatePreviewIframeHeight,
  getRuntimeTextElements,
} from "./editor-preview";
import type { ReadyPreviewDocument } from "./editor-types";

export function getReadyPreviewDocument(iframe: HTMLIFrameElement | null): ReadyPreviewDocument | null {
  const doc = iframe?.contentDocument;
  if (!doc?.documentElement || !doc.body || !doc.head) return null;

  return {
    doc,
    root: doc.documentElement,
    body: doc.body as HTMLBodyElement,
    head: doc.head as HTMLHeadElement,
  };
}

function ensurePreviewFrameStyle(doc: Document, head: HTMLHeadElement, pageGap: number) {
  let frameStyle = doc.getElementById("celion-preview-frame-style");
  if (!frameStyle) {
    frameStyle = doc.createElement("style");
    frameStyle.id = "celion-preview-frame-style";
    head.appendChild(frameStyle);
  }
  frameStyle.textContent = buildPreviewFrameCss(pageGap);
  return frameStyle;
}

export function preparePreviewFrame(
  iframe: HTMLIFrameElement | null,
  options: { previewWidth: number; pageGap: number },
) {
  const previewDocument = getReadyPreviewDocument(iframe);
  if (!previewDocument) return null;

  const { doc, root, body, head } = previewDocument;
  root.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.margin = "0";
  body.style.minWidth = `${options.previewWidth}px`;
  ensurePreviewFrameStyle(doc, head, options.pageGap);

  const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
  applyPreviewPageSpacing(pages, options.pageGap);
  pages.forEach((page, index) => {
    page.style.cursor = "default";
    page.setAttribute("data-slide-index", String(index));
    getRuntimeTextElements(page).forEach((element, textIndex) => {
      element.setAttribute("data-celion-runtime-text-index", String(textIndex));
    });
    page.querySelectorAll<HTMLElement>("[data-text-editable]").forEach((editable, editableIndex) => {
      editable.setAttribute("data-celion-edit-id", `slide-${index}-text-${editableIndex}`);
    });
  });

  return {
    ...previewDocument,
    pages,
  };
}

export function measurePreviewFrameHeight(
  iframe: HTMLIFrameElement | null,
  options: { pageHeight: number; pageGap: number },
) {
  const previewDocument = getReadyPreviewDocument(iframe);
  if (!previewDocument) return null;

  const { doc, root } = previewDocument;
  const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
  const lastPage = pages.at(-1);
  const measuredHeight = lastPage
    ? lastPage.offsetTop + lastPage.offsetHeight + 40
    : root.scrollHeight;
  const deterministicHeight = estimatePreviewIframeHeight(pages.length, options.pageHeight, options.pageGap);

  return Math.max(options.pageHeight, Math.ceil(measuredHeight), deterministicHeight);
}
