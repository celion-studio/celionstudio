"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import type { ProjectRecord, ProjectStatus } from "@/types/project";
import { OAuthCallbackHandler } from "@/components/auth/OAuthCallbackHandler";
import { WizardContent } from "@/components/wizard/WizardContent";
import { EBOOK_PAGE_SIZE_PX } from "@/lib/ebook-format";
import { countCelionSlides } from "@/lib/ebook-html";
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  type CelionEditableElement,
  type CelionEbookDocument,
} from "@/lib/ebook-document";
import {
  buildPageSummariesFromDocument,
  buildPageSummariesFromElements,
  estimatePreviewIframeHeight,
  normalizeEditorHtml,
  pickSelectableElement,
  pickRuntimeTextElement,
  runtimeTextIndexFromElement,
  type PageSummary,
} from "./editor-preview";
import {
  appendScopedLayoutBoxToDocument,
  appendScopedLayoutTransformToDocument,
  appendScopedStyleToDocument,
  applyDocumentTextEdit,
  applyLegacyHtmlTextEdit,
  insertImageIntoDocument,
  removeScopedLayoutFromDocument,
} from "./editor-document-edits";
import {
  LAYOUT_PROPS,
  cssPropertyName,
  layoutMarker,
  removeExistingScopedRules,
} from "./editor-style-rules";
import {
  measurePreviewFrameHeight,
  preparePreviewFrame,
} from "./editor-preview-frame";
import {
  clampLayoutNumber,
  formatLayoutNumber,
  layoutNumber,
} from "./editor-layout-values";
import {
  createPreviewLayoutChrome,
  getLayoutTargetElement,
} from "./editor-layout-chrome";
import {
  getCandidateCelionIds,
  getDocumentPageContext,
  getPointedElements,
  getRuntimeTextBySelection,
  readInspectorStyleValues,
  readLayoutValues,
  selectPreviewElement,
} from "./editor-preview-selection";
import {
  EditorInspectorPanel,
  EditorPageList,
  EditorPreviewPane,
  EditorTopBar,
} from "./editor-shell-panels";
import type { EditorMode, InspectorLayoutValues } from "./editor-types";
import { clearEditorSelectionFromDocument } from "./export-cleanup";
import { useEditorExport } from "./use-editor-export";
import { useEditorLayoutSelection } from "./use-editor-layout-selection";
import { useEditorUndo } from "./use-editor-undo";
import { useEditorSave } from "./use-editor-save";
import { useEditorSelection } from "./use-editor-selection";

const PREVIEW_WIDTH = 640;
const PAGE_HEIGHT: number = EBOOK_PAGE_SIZE_PX.height;
const PAGE_GAP = 28;
const EDITOR_TOP_RAIL_HEIGHT = 56;
const EDITOR_EDGE_GAP = 16;
// Image data URLs are stored inside page HTML, so keep this below the save limit after base64 expansion.
const MAX_EDITOR_IMAGE_BYTES = 48_000;
const MAX_EDITOR_IMAGE_KILOBYTES = Math.floor(MAX_EDITOR_IMAGE_BYTES / 1_000);
const SUPPORTED_EDITOR_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  initialHtml: string;
  initialDocument: CelionEbookDocument | null;
};

function removeLiveLayoutCss(doc: Document, pageId: string, element: CelionEditableElement) {
  const selector = `[data-celion-page="${pageId}"] ${element.selector}`;
  const markers = layoutMarker(pageId, element.id);

  doc.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    style.textContent = removeExistingScopedRules({
      css: style.textContent ?? "",
      selector,
      markers,
      shouldRemoveLegacyRule: (props) => props.length > 0 && props.every((prop) => LAYOUT_PROPS.has(prop)),
    }).css;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file."));
      }
    });
    reader.addEventListener("error", () => reject(new Error("Could not read image file.")));
    reader.readAsDataURL(file);
  });
}

export function EditorShell({
  projectId,
  projectTitle,
  projectStatus,
  initialHtml,
  initialDocument,
}: Props) {
  const initialEbookDocument = initialDocument ? normalizeEbookDocument(initialDocument) : null;
  const initialHasContent = Boolean(initialEbookDocument || initialHtml.trim());
  const initialSetupOpen = !initialHasContent && !["ready", "exported"].includes(projectStatus);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const iframeClickCleanupRef = useRef<(() => void) | null>(null);
  const handleIframeLoadRef = useRef<() => void>(() => undefined);
  const refreshLayoutChromeRef = useRef<(() => void) | null>(null);
  const measureTimeoutRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const prepareFallbackRef = useRef<number | null>(null);
  const editorModeRef = useRef<EditorMode>("view");
  const {
    latestDocumentRef,
    saveError,
    setSaveError,
    saveHtml,
    queueDocumentSave,
  } = useEditorSave(projectId, initialEbookDocument);
  const [ebookDocument, setEbookDocument] = useState<CelionEbookDocument | null>(initialEbookDocument);
  const [html, setHtml] = useState(() => initialEbookDocument ? compileEbookDocumentToHtml(initialEbookDocument) : normalizeEditorHtml(initialHtml));
  const [displayTitle, setDisplayTitle] = useState(projectTitle);
  const [setupOpen, setSetupOpen] = useState(initialSetupOpen);
  const [editorMode, setEditorMode] = useState<EditorMode>("view");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(PAGE_HEIGHT);
  const [pageSummaries, setPageSummaries] = useState<PageSummary[]>([]);
  const {
    exportOpen,
    exporting,
    exportError,
    setExportOpen,
    exportAs,
  } = useEditorExport({
    displayTitle,
    html,
    iframeRef,
    latestDocumentRef,
  });
  const selection = useEditorSelection();
  const { selectElement } = selection;
  const {
    layoutTargetLabel,
    layoutValues,
    layoutValuesRef,
    selectedLayoutTargetRef,
    setLayoutTarget,
    setLayoutValues,
  } = useEditorLayoutSelection();
  const {
    canUndo,
    clearUndoStack,
    popUndoSnapshot,
    pushDocumentSnapshot,
    pushHtmlSnapshot,
  } = useEditorUndo();

  const measurePreview = useCallback(() => {
    const height = measurePreviewFrameHeight(iframeRef.current, {
      pageHeight: PAGE_HEIGHT,
      pageGap: PAGE_GAP,
    });
    if (height !== null) {
      setIframeHeight((current) => current === height ? current : height);
    }
  }, []);

  const cleanupIframeEffects = useCallback(() => {
    iframeClickCleanupRef.current?.();
    iframeClickCleanupRef.current = null;
    refreshLayoutChromeRef.current = null;

    if (measureTimeoutRef.current !== null) {
      window.clearTimeout(measureTimeoutRef.current);
      measureTimeoutRef.current = null;
    }

    if (measureFrameRef.current !== null) {
      window.cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = null;
    }

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    if (prepareFallbackRef.current !== null) {
      window.clearTimeout(prepareFallbackRef.current);
      prepareFallbackRef.current = null;
    }
  }, []);

  useEffect(() => cleanupIframeEffects, [cleanupIframeEffects]);

  const applyLiveStyleToElement = useCallback((pageId: string, element: CelionEditableElement, prop: string, value: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const node = getLayoutTargetElement(doc, element, pageId);
    if (!node) return;

    node.style.setProperty(cssPropertyName(prop), value);
    refreshLayoutChromeRef.current?.();
  }, []);

  const applyLiveLayoutTransformToElement = useCallback((pageId: string, element: CelionEditableElement, transform: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const node = getLayoutTargetElement(doc, element, pageId);
    if (!node) return;

    node.style.transform = transform;
    refreshLayoutChromeRef.current?.();
  }, []);

  const applyLiveLayoutBoxToElement = useCallback((pageId: string, element: CelionEditableElement, width: string, height: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const node = getLayoutTargetElement(doc, element, pageId);
    if (!node) return;

    node.style.width = width;
    node.style.height = height;
    refreshLayoutChromeRef.current?.();
  }, []);

  const resetLiveLayoutForElement = useCallback((pageId: string, element: CelionEditableElement) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const node = getLayoutTargetElement(doc, element, pageId);
    if (!node) return;

    removeLiveLayoutCss(doc, pageId, element);
    node.style.transform = "";
    node.style.width = "";
    node.style.height = "";
    refreshLayoutChromeRef.current?.();
  }, []);

  const applyLiveTextToSelection = useCallback((value: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return false;

    const target = selection.selectedRuntimeText
      ? getRuntimeTextBySelection(doc, selection.selectedRuntimeText)
      : selection.selectedElement
        ? getLayoutTargetElement(doc, selection.selectedElement, selection.selectedPageId)
        : null;

    if (!target) return false;

    target.textContent = value;
    refreshLayoutChromeRef.current?.();
    return true;
  }, [selection.selectedElement, selection.selectedRuntimeText]);

  const applyLayoutTransformToElement = useCallback((
    pageId: string,
    element: CelionEditableElement,
    transform: string,
  ) => {
    const currentDocument = latestDocumentRef.current;
    const layoutEdit = appendScopedLayoutTransformToDocument({
      document: currentDocument,
      selectedPageId: pageId,
      selectedElement: element,
      transform,
    });
    if (!layoutEdit.ok) {
      if (layoutEdit.reason === "target-missing") {
        setSaveError("Could not find the selected element. Click it again and retry.");
      }
      return;
    }

    pushDocumentSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    applyLiveLayoutTransformToElement(pageId, element, transform);
    void queueDocumentSave(layoutEdit.value);
  }, [applyLiveLayoutTransformToElement, latestDocumentRef, pushDocumentSnapshot, queueDocumentSave, setSaveError]);

  const applyLayoutBoxToElement = useCallback((
    pageId: string,
    element: CelionEditableElement,
    width: string,
    height: string,
    transform?: string,
  ) => {
    const currentDocument = latestDocumentRef.current;
    const layoutEdit = appendScopedLayoutBoxToDocument({
      document: currentDocument,
      selectedPageId: pageId,
      selectedElement: element,
      width,
      height,
      transform,
    });
    if (!layoutEdit.ok) {
      if (layoutEdit.reason === "target-missing") {
        setSaveError("Could not find the selected element. Click it again and retry.");
      }
      return;
    }

    pushDocumentSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    if (transform) {
      applyLiveLayoutTransformToElement(pageId, element, transform);
    }
    applyLiveLayoutBoxToElement(pageId, element, width, height);
    void queueDocumentSave(layoutEdit.value);
  }, [applyLiveLayoutBoxToElement, applyLiveLayoutTransformToElement, latestDocumentRef, pushDocumentSnapshot, queueDocumentSave, setSaveError]);

  const handleIframeLoad = useCallback(() => {
    cleanupIframeEffects();

    const previewFrame = preparePreviewFrame(iframeRef.current, {
      previewWidth: PREVIEW_WIDTH,
      pageGap: PAGE_GAP,
    });
    if (!previewFrame) return;

    const { doc, pages } = previewFrame;
    const currentDocument = latestDocumentRef.current;
    setSlideCount((current) => current === pages.length ? current : pages.length);
    if (!currentDocument) {
      setPageSummaries(buildPageSummariesFromElements(pages));
    }

    const layoutChrome = createPreviewLayoutChrome(doc, {
      getCurrentTarget: () => selectedLayoutTargetRef.current,
      onTransform: (target, transform) => {
        applyLayoutTransformToElement(target.pageId, target.element, transform);
      },
      onResize: (target, width, height, transform) => {
        applyLayoutBoxToElement(target.pageId, target.element, width, height, transform);
      },
    });
    refreshLayoutChromeRef.current = () => {
      const currentTarget = selectedLayoutTargetRef.current;
      if (!currentTarget) return;

      const selectedNode = getLayoutTargetElement(doc, currentTarget.element, currentTarget.pageId);
      const pageEl = selectedNode?.closest<HTMLElement>("[data-celion-page]");
      if (selectedNode && pageEl?.getAttribute("data-celion-page") === currentTarget.pageId) {
        setLayoutValues(readLayoutValues(doc, selectedNode));
        layoutChrome.showFor(selectedNode);
      }
    };

    let hoverSnapshot: {
      element: HTMLElement;
      outline: string;
      outlineOffset: string;
      cursor: string;
    } | null = null;

    const clearHover = () => {
      if (!hoverSnapshot) return;

      const { element, outline, outlineOffset, cursor } = hoverSnapshot;
      if (!element.hasAttribute("data-selected")) {
        element.style.outline = outline;
        element.style.outlineOffset = outlineOffset;
        element.style.cursor = cursor;
      }
      element.removeAttribute("data-celion-hovered");
      hoverSnapshot = null;
    };

    const showHover = (element: HTMLElement, kind: "layout" | "text") => {
      if (element.hasAttribute("data-selected")) {
        clearHover();
        return;
      }
      if (hoverSnapshot?.element === element) return;

      clearHover();
      hoverSnapshot = {
        element,
        outline: element.style.outline,
        outlineOffset: element.style.outlineOffset,
        cursor: element.style.cursor,
      };
      element.setAttribute("data-celion-hovered", kind);
      element.style.outline = kind === "layout" ? "1px dashed rgba(255, 90, 31, 0.72)" : "1px dashed rgba(255, 90, 31, 0.42)";
      element.style.outlineOffset = "2px";
      element.style.cursor = "pointer";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (editorModeRef.current !== "edit") {
        clearHover();
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-celion-editor-chrome]")) {
        clearHover();
        return;
      }

      const pointedElements = getPointedElements(doc, e, target);
      const layoutHoverTarget = pointedElements
        .map((element) => element.closest<HTMLElement>("[data-celion-id]"))
        .find((element): element is HTMLElement => Boolean(element));
      if (layoutHoverTarget) {
        showHover(layoutHoverTarget, "layout");
        return;
      }

      const textHoverTarget = pickRuntimeTextElement(pointedElements, target)
        ?? target.closest<HTMLElement>("[data-text-editable]")
        ?? (target.textContent?.trim() ? target : null);
      if (textHoverTarget) {
        showHover(textHoverTarget, "text");
      } else {
        clearHover();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (editorModeRef.current !== "edit") return;
      clearHover();

      const target = e.target as HTMLElement;
      const pointedElements = getPointedElements(doc, e, target);

      if (currentDocument) {
        const pageContext = getDocumentPageContext(currentDocument, pointedElements, target);
        if (!pageContext) return;

        const { page, pageId, pageIndex } = pageContext;
        const candidateIds = getCandidateCelionIds(pointedElements);
        const manifestElement = pickSelectableElement(page, candidateIds);
        const runtimeTextEl = pickRuntimeTextElement(pointedElements, target);
        const runtimeTextIndex = runtimeTextIndexFromElement(runtimeTextEl);

        if (
          runtimeTextEl &&
          runtimeTextIndex !== null &&
          (!manifestElement || (manifestElement.type !== "text" && !manifestElement.editableProps.includes("text")))
        ) {
          const text = runtimeTextEl.textContent?.trim() ?? "";
          if (!text) return;

          selectPreviewElement(doc, runtimeTextEl);
          const layoutTargetEl = manifestElement ? getLayoutTargetElement(doc, manifestElement, pageId) : null;
          if (manifestElement && layoutTargetEl) {
            setLayoutTarget({ pageId, element: manifestElement });
            setLayoutValues(readLayoutValues(doc, layoutTargetEl));
            layoutChrome.showFor(layoutTargetEl);
          } else {
            setLayoutTarget(null);
            layoutChrome.hide();
          }
          selectElement({
            text,
            pageId,
            selector: "",
            runtimeText: { mode: "document", pageId, pageIndex, textIndex: runtimeTextIndex },
            styleValues: readInspectorStyleValues(doc, runtimeTextEl),
            element: {
              id: `runtime-text-${pageId}-${runtimeTextIndex}`,
              role: "text",
              type: "text",
              selector: `runtime-text:${runtimeTextIndex}`,
              label: "Text",
              editableProps: ["text"],
            },
          });
          setCurrentSlide((current) => current === pageIndex ? current : pageIndex);
          return;
        }

        if (!manifestElement) return;

        const celionEl = getLayoutTargetElement(doc, manifestElement, pageId);
        if (!celionEl) return;

        const text = celionEl.textContent?.trim() ?? "";

        selectPreviewElement(doc, celionEl);
        setLayoutTarget({ pageId, element: manifestElement });
        setLayoutValues(readLayoutValues(doc, celionEl));
        layoutChrome.showFor(celionEl);
        selectElement({
          text,
          pageId,
          element: manifestElement,
          selector: "",
          runtimeText: null,
          styleValues: readInspectorStyleValues(doc, celionEl),
        });
        setCurrentSlide((current) => current === pageIndex ? current : pageIndex);
        return;
      }

      const runtimeTextEl = pickRuntimeTextElement(pointedElements, target);
      const textEl = runtimeTextEl ?? target.closest("[data-text-editable]") ?? (target.textContent?.trim() ? target : null);
      if (!textEl) return;

      const text = textEl.textContent?.trim() ?? "";
      if (!text) return;

      selectPreviewElement(doc, textEl);
      setLayoutTarget(null);
      layoutChrome.hide();

      const tag = textEl.tagName.toLowerCase();
      const pageEl = textEl.closest(".slide");
      const pageIdx = pageEl?.getAttribute("data-slide-index") ?? "0";
      const editableIndex = pageEl
        ? Array.from(pageEl.querySelectorAll("[data-text-editable]")).indexOf(textEl)
        : -1;
      const runtimeTextIndex = runtimeTextIndexFromElement(textEl);
      setCurrentSlide((current) => current === Number(pageIdx) ? current : Number(pageIdx));
      if (runtimeTextIndex !== null) {
        selectElement({
          text,
          pageId: "",
          element: null,
          selector: `runtime:${pageIdx}:${runtimeTextIndex}`,
          runtimeText: {
            mode: "legacy",
            pageId: pageIdx,
            pageIndex: Number(pageIdx),
            textIndex: runtimeTextIndex,
          },
          styleValues: readInspectorStyleValues(doc, textEl as HTMLElement),
        });
      } else {
        selectElement({
          text,
          pageId: "",
          element: null,
          selector: editableIndex >= 0 ? `${pageIdx}:${editableIndex}` : `[data-slide-index="${pageIdx}"] ${tag}`,
          runtimeText: null,
          styleValues: readInspectorStyleValues(doc, textEl as HTMLElement),
        });
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (editorModeRef.current !== "edit") return;
      layoutChrome.handlePointerDown(e);
    };

    doc.addEventListener("click", handleClick);
    doc.addEventListener("pointermove", handlePointerMove);
    doc.addEventListener("pointerleave", clearHover);
    doc.addEventListener("pointerdown", handlePointerDown);
    iframeClickCleanupRef.current = () => {
      doc.removeEventListener("click", handleClick);
      doc.removeEventListener("pointermove", handlePointerMove);
      doc.removeEventListener("pointerleave", clearHover);
      doc.removeEventListener("pointerdown", handlePointerDown);
      clearHover();
    };

    const currentLayoutTarget = selectedLayoutTargetRef.current;
    if (editorModeRef.current === "edit" && currentLayoutTarget) {
      const selectedNode = getLayoutTargetElement(doc, currentLayoutTarget.element, currentLayoutTarget.pageId);
      const pageEl = selectedNode?.closest<HTMLElement>("[data-celion-page]");
      if (selectedNode && pageEl?.getAttribute("data-celion-page") === currentLayoutTarget.pageId) {
        selectPreviewElement(doc, selectedNode);
        setLayoutValues(readLayoutValues(doc, selectedNode));
        layoutChrome.showFor(selectedNode);
      } else {
        layoutChrome.hide();
      }
    }

    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measurePreview();
    });
    measureTimeoutRef.current = window.setTimeout(() => {
      measureTimeoutRef.current = null;
      measurePreview();
    }, 250);
  }, [applyLayoutBoxToElement, applyLayoutTransformToElement, cleanupIframeEffects, latestDocumentRef, measurePreview, selectElement, setLayoutTarget, setLayoutValues]);

  useEffect(() => {
    handleIframeLoadRef.current = handleIframeLoad;
  }, [handleIframeLoad]);

  useEffect(() => {
    if (!html || setupOpen) return;

    if (prepareFallbackRef.current !== null) {
      window.clearTimeout(prepareFallbackRef.current);
    }

    prepareFallbackRef.current = window.setTimeout(() => {
      prepareFallbackRef.current = null;
      handleIframeLoadRef.current();
    }, 120);

    return () => {
      if (prepareFallbackRef.current !== null) {
        window.clearTimeout(prepareFallbackRef.current);
        prepareFallbackRef.current = null;
      }
    };
  }, [html, setupOpen]);

  useEffect(() => {
    const count = ebookDocument ? ebookDocument.pages.length : countCelionSlides(html);
    setSlideCount((current) => current === count ? current : count);
    const estimatedHeight = estimatePreviewIframeHeight(count, PAGE_HEIGHT, PAGE_GAP);
    setIframeHeight((current) => current === estimatedHeight ? current : estimatedHeight);
    setPageSummaries(ebookDocument ? buildPageSummariesFromDocument(ebookDocument) : []);
  }, [ebookDocument, html]);

  const scrollToPage = useCallback((index: number) => {
    setCurrentSlide((current) => current === index ? current : index);
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const scroller = previewScrollRef.current;
    if (!doc || !scroller) return;

    const page = doc.querySelectorAll<HTMLElement>(".slide")[index];
    if (!page) return;

    scroller.scrollTo({
      top: Math.max(0, page.offsetTop - 8),
      behavior: "smooth",
    });
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      const scroller = previewScrollRef.current;
      if (!doc || !scroller) return;

      const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
      if (pages.length === 0) return;

      const viewportAnchor = scroller.scrollTop + 140;
      const nearest = pages.reduce((best, page, index) => {
        const distance = Math.abs(page.offsetTop - viewportAnchor);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });

      setCurrentSlide((current) => current === nearest.index ? current : nearest.index);
    });
  }, []);

  const applyEdit = () => {
    if (!selection.editValue.trim()) return;

    const nextText = selection.editValue.trim();
    const currentDocument = latestDocumentRef.current ?? ebookDocument;
    const documentEdit = applyDocumentTextEdit({
      document: currentDocument,
      selectedPageId: selection.selectedPageId,
      selectedElement: selection.selectedElement,
      selectedRuntimeText: selection.selectedRuntimeText,
      editValue: nextText,
    });
    if (documentEdit.ok) {
      pushDocumentSnapshot(currentDocument);
      latestDocumentRef.current = documentEdit.value;
      setEbookDocument(documentEdit.value);
      if (!applyLiveTextToSelection(nextText)) {
        setHtml(compileEbookDocumentToHtml(documentEdit.value));
      }
      selection.commitTextValue(nextText);
      void queueDocumentSave(documentEdit.value);
      return;
    }
    if (documentEdit.reason === "target-missing") {
      setSaveError("Could not find the selected text. Click it again and retry.");
      return;
    }

    if (!selection.selectedText || !selection.selectedSelector) return;

    const legacyEdit = applyLegacyHtmlTextEdit({
      html,
      selectedSelector: selection.selectedSelector,
      editValue: nextText,
    });
    if (!legacyEdit.ok) {
      if (legacyEdit.reason !== "not-applicable") {
        setSaveError("Could not find the selected text. Click it again and retry.");
      }
      return;
    }

    const newHtml = legacyEdit.value;
    pushHtmlSnapshot(html);
    setHtml(newHtml);
    selection.clearSelection();
    void saveHtml(newHtml);
  };

  const applyStyleToSelectedElement = (prop: string, value: string) => {
    const currentDocument = latestDocumentRef.current ?? ebookDocument;
    const styleEdit = appendScopedStyleToDocument({
      document: currentDocument,
      selectedPageId: selection.selectedPageId,
      selectedElement: selection.selectedElement,
      prop,
      value,
    });
    if (!styleEdit.ok) {
      if (styleEdit.reason === "target-missing") {
        setSaveError("Could not find the selected text. Click it again and retry.");
      }
      return;
    }

    pushDocumentSnapshot(currentDocument);
    latestDocumentRef.current = styleEdit.value;
    setEbookDocument(styleEdit.value);
    if (selection.selectedElement) {
      applyLiveStyleToElement(selection.selectedPageId, selection.selectedElement, prop, value);
    }
    selection.setStyleValue(prop, value);
    void queueDocumentSave(styleEdit.value);
  };

  const triggerImageInput = useCallback(() => {
    if (!latestDocumentRef.current && !ebookDocument) {
      setSaveError("Image insertion is available after an ebook document is generated.");
      return;
    }

    imageInputRef.current?.click();
  }, [ebookDocument, latestDocumentRef, setSaveError]);

  const handleImageInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (!SUPPORTED_EDITOR_IMAGE_TYPES.has(file.type)) {
      setSaveError("Use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_EDITOR_IMAGE_BYTES) {
      setSaveError(`Use an image under ${MAX_EDITOR_IMAGE_KILOBYTES} KB for now.`);
      return;
    }

    const currentDocument = latestDocumentRef.current ?? ebookDocument;
    if (!currentDocument) {
      setSaveError("Image insertion is available after an ebook document is generated.");
      return;
    }

    let src = "";
    try {
      src = await readFileAsDataUrl(file);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not read image file.");
      return;
    }

    const imageEdit = insertImageIntoDocument({
      document: currentDocument,
      pageIndex: currentSlide,
      src,
      alt: file.name.replace(/\.[a-z0-9]+$/i, ""),
    });
    if (!imageEdit.ok) {
      setSaveError(`Use a smaller image under ${MAX_EDITOR_IMAGE_KILOBYTES} KB that fits this page.`);
      return;
    }

    const { document: nextDocument, pageId, element } = imageEdit.value;
    pushDocumentSnapshot(currentDocument);
    latestDocumentRef.current = nextDocument;
    setEbookDocument(nextDocument);
    setHtml(compileEbookDocumentToHtml(nextDocument));
    setLayoutTarget({ pageId, element });
    setLayoutValues(null);
    selection.selectElement({
      text: "",
      pageId,
      element,
      selector: "",
      runtimeText: null,
      styleValues: {},
    });
    void queueDocumentSave(nextDocument);
  }, [
    currentSlide,
    ebookDocument,
    latestDocumentRef,
    pushDocumentSnapshot,
    queueDocumentSave,
    selection,
    setLayoutTarget,
    setLayoutValues,
    setSaveError,
  ]);

  const applyLayoutValueToSelectedElement = useCallback((prop: keyof InspectorLayoutValues, value: number) => {
    const target = selectedLayoutTargetRef.current;
    if (!target) return;

    const currentValues = layoutValuesRef.current ?? { x: "0", y: "0", width: "", height: "" };
    const nextValues = {
      ...currentValues,
      [prop]: formatLayoutNumber(value),
    };
    setLayoutValues(nextValues);

    if (prop === "x" || prop === "y") {
      const x = layoutNumber(nextValues.x, 0, -2000, 2000);
      const y = layoutNumber(nextValues.y, 0, -2000, 2000);
      applyLayoutTransformToElement(target.pageId, target.element, `translate(${formatLayoutNumber(x)}px, ${formatLayoutNumber(y)}px)`);
      return;
    }

    const rawWidth = Number(nextValues.width);
    const rawHeight = Number(nextValues.height);
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight)) return;

    const width = clampLayoutNumber(rawWidth, 24, 2000);
    const height = clampLayoutNumber(rawHeight, 24, 2000);

    applyLayoutBoxToElement(target.pageId, target.element, `${formatLayoutNumber(width)}px`, `${formatLayoutNumber(height)}px`);
  }, [applyLayoutBoxToElement, applyLayoutTransformToElement, setLayoutValues]);

  const resetLayoutForSelectedElement = useCallback(() => {
    const target = selectedLayoutTargetRef.current;
    if (!target) return;

    const currentDocument = latestDocumentRef.current;
    const layoutEdit = removeScopedLayoutFromDocument({
      document: currentDocument,
      selectedPageId: target.pageId,
      selectedElement: target.element,
    });
    if (!layoutEdit.ok) return;

    pushDocumentSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    resetLiveLayoutForElement(target.pageId, target.element);
    void queueDocumentSave(layoutEdit.value);
  }, [latestDocumentRef, pushDocumentSnapshot, queueDocumentSave, resetLiveLayoutForElement]);

  const undoLastEdit = useCallback(() => {
    const snapshot = popUndoSnapshot();
    if (!snapshot) return;

    if (snapshot.type === "html") {
      latestDocumentRef.current = null;
      setEbookDocument(null);
      setHtml(snapshot.html);
      setLayoutTarget(null);
      selection.clearSelection();
      void saveHtml(snapshot.html);
      return;
    }

    const restoredDocument = structuredClone(snapshot.document) as CelionEbookDocument;
    latestDocumentRef.current = restoredDocument;
    setEbookDocument(restoredDocument);
    setHtml(compileEbookDocumentToHtml(restoredDocument));
    setLayoutTarget(null);
    selection.clearSelection();
    void queueDocumentSave(restoredDocument);
  }, [latestDocumentRef, popUndoSnapshot, queueDocumentSave, saveHtml, selection, setLayoutTarget]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editorModeRef.current !== "edit") return;
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;

      event.preventDefault();
      undoLastEdit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoLastEdit]);

  const handlePageSelect = useCallback((index: number) => {
    scrollToPage(index);
  }, [scrollToPage]);

  const clearPreviewSelection = useCallback(() => {
    setLayoutTarget(null);
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      clearEditorSelectionFromDocument(doc);
    }
    selection.clearSelection();
  }, [selection, setLayoutTarget]);

  const handleModeChange = useCallback((mode: EditorMode) => {
    editorModeRef.current = mode;
    setEditorMode(mode);
    if (mode === "view") {
      clearPreviewSelection();
    }
  }, [clearPreviewSelection]);

  const handleWizardGenerated = useCallback((project: ProjectRecord) => {
    const nextDocument = project.profile.ebookDocument
      ? normalizeEbookDocument(project.profile.ebookDocument)
      : null;
    const nextHtml = nextDocument
      ? compileEbookDocumentToHtml(nextDocument)
      : normalizeEditorHtml(project.profile.ebookHtml ?? "");

    latestDocumentRef.current = nextDocument;
    setDisplayTitle(project.title);
    setEbookDocument(nextDocument);
    setHtml(nextHtml);
    setCurrentSlide(0);
    setLayoutTarget(null);
    clearUndoStack();
    selection.clearSelection();
    editorModeRef.current = "view";
    setEditorMode("view");
    setSetupOpen(false);
  }, [clearUndoStack, latestDocumentRef, selection, setLayoutTarget]);

  const handleStartBlankProject = useCallback(() => {
    selection.clearSelection();
    editorModeRef.current = "view";
    setEditorMode("view");
    setSetupOpen(false);
  }, [selection]);

  const editorShellStyle = {
    "--editor-edge-gap": `${EDITOR_EDGE_GAP}px`,
    "--editor-content-min-height": `calc(100vh - ${EDITOR_TOP_RAIL_HEIGHT + EDITOR_EDGE_GAP}px)`,
  } as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <div className="editor-shell" style={editorShellStyle}>
      <OAuthCallbackHandler />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageInputChange}
        className="editor-image-input"
      />
      <EditorTopBar
        projectTitle={displayTitle}
        saveError={saveError}
        exportError={exportError}
        exporting={exporting}
        exportOpen={exportOpen}
        canExport={!setupOpen}
        canAddImage={Boolean(ebookDocument)}
        showModeToggle={!setupOpen && Boolean(html)}
        editorMode={editorMode}
        canUndo={canUndo}
        edgeGap={EDITOR_EDGE_GAP}
        topRailHeight={EDITOR_TOP_RAIL_HEIGHT}
        onModeChange={handleModeChange}
        onAddImage={triggerImageInput}
        onUndo={undoLastEdit}
        onToggleExport={() => setExportOpen((open) => !open)}
        onExport={exportAs}
      />

      <div className="editor-shell-body">
        {setupOpen ? (
          <div className="editor-setup-panel">
            <WizardContent
              projectId={projectId}
              variant="editor"
              onGenerated={handleWizardGenerated}
              onStartBlank={handleStartBlankProject}
            />
          </div>
        ) : (
          <>
            <EditorPageList
              slideCount={slideCount}
              currentSlide={currentSlide}
              pageSummaries={pageSummaries}
              onSelectPage={handlePageSelect}
            />

            <motion.div
              animate={{
                opacity: 1,
                scale: editorMode === "edit" ? 1.006 : 1,
              }}
              className="editor-preview-shell"
              initial={false}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <EditorPreviewPane
                html={html}
                width={PREVIEW_WIDTH}
                iframeHeight={iframeHeight}
                iframeRef={iframeRef}
                previewScrollRef={previewScrollRef}
                onIframeLoad={handleIframeLoad}
                onPreviewScroll={handlePreviewScroll}
              />
            </motion.div>

            <AnimatePresence mode="popLayout">
              {editorMode === "edit" && (
                <EditorInspectorPanel
                  key="editor-inspector"
                  selectedElement={selection.selectedElement}
                  inspectorElement={selection.inspectorElement}
                  layoutTargetLabel={layoutTargetLabel}
                  layoutValues={layoutValues}
                  editValue={selection.editValue}
                  styleValues={selection.styleValues}
                  topRailHeight={EDITOR_TOP_RAIL_HEIGHT}
                  edgeGap={EDITOR_EDGE_GAP}
                  onTextChange={selection.setEditValue}
                  onApplyText={applyEdit}
                  onStyleChange={applyStyleToSelectedElement}
                  onLayoutChange={applyLayoutValueToSelectedElement}
                  onResetLayout={resetLayoutForSelectedElement}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      </div>
    </MotionConfig>
  );
}
