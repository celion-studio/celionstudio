import {
  applyPreviewSlideSpacing,
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

function ensurePreviewFrameStyle(doc: Document, head: HTMLHeadElement, slideGap: number) {
  let frameStyle = doc.getElementById("celion-preview-frame-style");
  if (!frameStyle) {
    frameStyle = doc.createElement("style");
    frameStyle.id = "celion-preview-frame-style";
    head.appendChild(frameStyle);
  }
  frameStyle.textContent = buildPreviewFrameCss(slideGap);
  return frameStyle;
}

export function preparePreviewFrame(
  iframe: HTMLIFrameElement | null,
  options: { previewWidth: number; slideGap: number },
) {
  const previewDocument = getReadyPreviewDocument(iframe);
  if (!previewDocument) return null;

  const { doc, root, body, head } = previewDocument;
  root.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.margin = "0";
  body.style.minWidth = `${options.previewWidth}px`;
  ensurePreviewFrameStyle(doc, head, options.slideGap);

  const slides = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
  applyPreviewSlideSpacing(slides, options.slideGap);
  slides.forEach((slide, index) => {
    slide.style.cursor = "default";
    slide.setAttribute("data-slide-index", String(index));
    getRuntimeTextElements(slide).forEach((element, textIndex) => {
      element.setAttribute("data-celion-runtime-text-index", String(textIndex));
    });
    slide.querySelectorAll<HTMLElement>("[data-text-editable]").forEach((editable, editableIndex) => {
      editable.setAttribute("data-celion-edit-id", `slide-${index}-text-${editableIndex}`);
    });
  });

  return {
    ...previewDocument,
    slides,
  };
}

export function measurePreviewFrameHeight(
  iframe: HTMLIFrameElement | null,
  options: { slideHeight: number; slideGap: number },
) {
  const previewDocument = getReadyPreviewDocument(iframe);
  if (!previewDocument) return null;

  const { doc, root } = previewDocument;
  const slides = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
  const lastSlide = slides.at(-1);
  const measuredHeight = lastSlide
    ? lastSlide.offsetTop + lastSlide.offsetHeight + 40
    : root.scrollHeight;
  const deterministicHeight = estimatePreviewIframeHeight(slides.length, options.slideHeight, options.slideGap);

  return Math.max(options.slideHeight, Math.ceil(measuredHeight), deterministicHeight);
}
