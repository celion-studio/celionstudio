"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import type { ProjectRecord, ProjectStatus } from "@/types/project";
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
  getRuntimeTextElements,
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
  removeScopedLayoutFromDocument,
} from "./editor-document-edits";
import {
  measurePreviewFrameHeight,
  preparePreviewFrame,
} from "./editor-preview-frame";
import {
  createPreviewLayoutChrome,
  getLayoutTargetElement,
  type LayoutTarget,
} from "./editor-layout-chrome";
import {
  EditorInspectorPanel,
  EditorPageList,
  EditorPreviewPane,
  EditorTopBar,
} from "./editor-shell-panels";
import type { EditorMode, InspectorLayoutValues, InspectorStyleValues } from "./editor-types";
import { clearEditorSelectionFromDocument } from "./export-cleanup";
import { useEditorExport } from "./use-editor-export";
import { useEditorSave } from "./use-editor-save";
import { useEditorSelection } from "./use-editor-selection";

const PREVIEW_WIDTH = 640;
const PAGE_HEIGHT: number = EBOOK_PAGE_SIZE_PX.height;
const PAGE_GAP = 28;
const EDITOR_TOP_RAIL_HEIGHT = 56;
const EDITOR_EDGE_GAP = 16;
const LAYOUT_PROPS = new Set(["transform", "width", "height"]);

type Props = {
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  initialHtml: string;
  initialDocument: CelionEbookDocument | null;
};

type UndoSnapshot =
  | { type: "document"; document: CelionEbookDocument }
  | { type: "html"; html: string };

function cssPropertyName(prop: string) {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatLayoutNumber(value: number) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function clampLayoutNumber(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (typeof min === "number") nextValue = Math.max(min, nextValue);
  if (typeof max === "number") nextValue = Math.min(max, nextValue);
  return nextValue;
}

function parseTranslate(transform: string | undefined) {
  if (!transform || transform === "none") return { x: 0, y: 0 };

  const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1]!.split(",").map((part) => Number(part.trim()));
    return {
      x: Number.isFinite(values[12]) ? values[12]! : 0,
      y: Number.isFinite(values[13]) ? values[13]! : 0,
    };
  }

  const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
  if (matrixMatch) {
    const values = matrixMatch[1]!.split(",").map((part) => Number(part.trim()));
    return {
      x: Number.isFinite(values[4]) ? values[4]! : 0,
      y: Number.isFinite(values[5]) ? values[5]! : 0,
    };
  }

  const translateMatch = transform.match(/translate(?:3d)?\(([^)]+)\)/);
  if (!translateMatch) return { x: 0, y: 0 };

  const [rawX = "0", rawY = "0"] = translateMatch[1]!.split(",");
  return {
    x: Number.parseFloat(rawX) || 0,
    y: Number.parseFloat(rawY) || 0,
  };
}

function layoutNumber(value: string | undefined, fallback: number, min?: number, max?: number) {
  const parsed = Number(value);
  return clampLayoutNumber(Number.isFinite(parsed) ? parsed : fallback, min, max);
}

function layoutMarker(pageId: string, elementId: string) {
  const safePageId = pageId.replace(/\*\//g, "").trim();
  const safeElementId = elementId.replace(/\*\//g, "").trim();
  return {
    start: `/* celion-layout:${safePageId}:${safeElementId} */`,
    end: `/* /celion-layout:${safePageId}:${safeElementId} */`,
  };
}

function removeLiveLayoutCss(doc: Document, pageId: string, element: CelionEditableElement) {
  const selector = `[data-celion-page="${pageId}"] ${element.selector}`;
  const markers = layoutMarker(pageId, element.id);
  const markerPattern = new RegExp(`\\s*${escapeRegex(markers.start)}\\s*\\n?${escapeRegex(selector)}\\s*\\{[^{}]*\\}\\s*\\n?${escapeRegex(markers.end)}\\s*`, "g");
  const legacyRulePattern = new RegExp(`(^|\\n)\\s*${escapeRegex(selector)}\\s*\\{([^{}]*)\\}\\s*(?=\\n|$)`, "g");

  doc.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    const withoutMarkers = (style.textContent ?? "").replace(markerPattern, "\n");
    style.textContent = withoutMarkers.replace(legacyRulePattern, (match, prefix: string, rawDeclarations: string) => {
      const props = rawDeclarations
        .split(";")
        .map((declaration) => declaration.split(":")[0]?.trim())
        .filter(Boolean);
      const isLayoutOnlyRule = props.length > 0 && props.every((prop) => LAYOUT_PROPS.has(prop));
      return isLayoutOnlyRule ? prefix : match;
    });
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
  const iframeClickCleanupRef = useRef<(() => void) | null>(null);
  const handleIframeLoadRef = useRef<() => void>(() => undefined);
  const refreshLayoutChromeRef = useRef<(() => void) | null>(null);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const measureTimeoutRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const prepareFallbackRef = useRef<number | null>(null);
  const editorModeRef = useRef<EditorMode>("view");
  const {
    latestDocumentRef,
    saving,
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
  const selectedLayoutTargetRef = useRef<LayoutTarget | null>(null);
  const layoutValuesRef = useRef<InspectorLayoutValues | null>(null);
  const [layoutTargetLabel, setLayoutTargetLabel] = useState("");
  const [layoutValues, setLayoutValuesState] = useState<InspectorLayoutValues | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const setLayoutValues = useCallback((values: InspectorLayoutValues | null) => {
    layoutValuesRef.current = values;
    setLayoutValuesState(values);
  }, []);

  const setLayoutTarget = useCallback((target: LayoutTarget | null) => {
    selectedLayoutTargetRef.current = target;
    setLayoutTargetLabel(target?.element.label ?? "");
    if (!target) setLayoutValues(null);
  }, [setLayoutValues]);

  const pushUndoSnapshot = useCallback((document: CelionEbookDocument | null) => {
    if (!document) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-19),
      { type: "document", document: structuredClone(document) as CelionEbookDocument },
    ];
    setCanUndo(true);
  }, []);

  const pushHtmlUndoSnapshot = useCallback((currentHtml: string) => {
    if (!currentHtml.trim()) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-19),
      { type: "html", html: currentHtml },
    ];
    setCanUndo(true);
  }, []);

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

    let target: HTMLElement | null = null;
    if (selection.selectedRuntimeText?.mode === "document") {
      const page = doc.querySelector<HTMLElement>(`[data-celion-page="${selection.selectedRuntimeText.pageId}"]`);
      target = page
        ? getRuntimeTextElements(page)[selection.selectedRuntimeText.textIndex] ?? null
        : null;
    } else if (selection.selectedRuntimeText?.mode === "legacy") {
      const page = doc.querySelectorAll<HTMLElement>(".slide")[selection.selectedRuntimeText.pageIndex];
      target = page
        ? getRuntimeTextElements(page)[selection.selectedRuntimeText.textIndex] ?? null
        : null;
    } else if (selection.selectedElement) {
      target = getLayoutTargetElement(doc, selection.selectedElement, selection.selectedPageId);
    }

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

    pushUndoSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    applyLiveLayoutTransformToElement(pageId, element, transform);
    void queueDocumentSave(layoutEdit.value);
  }, [applyLiveLayoutTransformToElement, latestDocumentRef, pushUndoSnapshot, queueDocumentSave, setSaveError]);

  const applyLayoutBoxToElement = useCallback((
    pageId: string,
    element: CelionEditableElement,
    width: string,
    height: string,
  ) => {
    const currentDocument = latestDocumentRef.current;
    const layoutEdit = appendScopedLayoutBoxToDocument({
      document: currentDocument,
      selectedPageId: pageId,
      selectedElement: element,
      width,
      height,
    });
    if (!layoutEdit.ok) {
      if (layoutEdit.reason === "target-missing") {
        setSaveError("Could not find the selected element. Click it again and retry.");
      }
      return;
    }

    pushUndoSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    applyLiveLayoutBoxToElement(pageId, element, width, height);
    void queueDocumentSave(layoutEdit.value);
  }, [applyLiveLayoutBoxToElement, latestDocumentRef, pushUndoSnapshot, queueDocumentSave, setSaveError]);

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

    const selectPreviewElement = (textEl: Element) => {
      doc.querySelectorAll("[data-selected]").forEach((el) => {
        el.removeAttribute("data-selected");
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      });
      textEl.setAttribute("data-selected", "true");
      (textEl as HTMLElement).style.outline = "2px solid #18181b";
      (textEl as HTMLElement).style.outlineOffset = "2px";
    };

    const readInspectorStyleValues = (element: HTMLElement): InspectorStyleValues => {
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
    };

    const readLayoutValues = (element: HTMLElement): InspectorLayoutValues => {
      const styles = doc.defaultView?.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const translate = parseTranslate(styles?.transform ?? element.style.transform);

      return {
        x: formatLayoutNumber(translate.x),
        y: formatLayoutNumber(translate.y),
        width: formatLayoutNumber(rect.width),
        height: formatLayoutNumber(rect.height),
      };
    };

    const layoutChrome = createPreviewLayoutChrome(doc, {
      getCurrentTarget: () => selectedLayoutTargetRef.current,
      onMove: (target, transform) => {
        applyLayoutTransformToElement(target.pageId, target.element, transform);
      },
      onResize: (target, width, height) => {
        applyLayoutBoxToElement(target.pageId, target.element, width, height);
      },
    });
    refreshLayoutChromeRef.current = () => {
      const currentTarget = selectedLayoutTargetRef.current;
      if (!currentTarget) return;

      const selectedNode = getLayoutTargetElement(doc, currentTarget.element, currentTarget.pageId);
      const pageEl = selectedNode?.closest<HTMLElement>("[data-celion-page]");
      if (selectedNode && pageEl?.getAttribute("data-celion-page") === currentTarget.pageId) {
        setLayoutValues(readLayoutValues(selectedNode));
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
      element.style.outline = kind === "layout" ? "1px dashed #6366f1" : "1px dashed #0ea5e9";
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

      const pointedElements = typeof doc.elementsFromPoint === "function"
        ? doc.elementsFromPoint(e.clientX, e.clientY)
        : [target];
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
      const pointedElements = typeof doc.elementsFromPoint === "function"
        ? doc.elementsFromPoint(e.clientX, e.clientY)
        : [target];

      if (currentDocument) {
        const pageEl = (pointedElements.find((element) => element.closest("[data-celion-page]")) ?? target)
          .closest<HTMLElement>("[data-celion-page]");
        const pageId = pageEl?.getAttribute("data-celion-page");
        if (!pageId) return;

        const pageIndex = currentDocument.pages.findIndex((page) => page.id === pageId);
        const page = pageIndex >= 0 ? currentDocument.pages[pageIndex] : null;
        if (!page) return;

        const candidateIds = pointedElements
          .map((element) => element.closest<HTMLElement>("[data-celion-id]")?.getAttribute("data-celion-id") ?? "")
          .filter((id, index, ids) => id && ids.indexOf(id) === index);
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

          selectPreviewElement(runtimeTextEl);
          const layoutTargetEl = manifestElement ? getLayoutTargetElement(doc, manifestElement, pageId) : null;
          if (manifestElement && layoutTargetEl) {
            setLayoutTarget({ pageId, element: manifestElement });
            setLayoutValues(readLayoutValues(layoutTargetEl));
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
            styleValues: readInspectorStyleValues(runtimeTextEl),
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

        selectPreviewElement(celionEl);
        setLayoutTarget({ pageId, element: manifestElement });
        setLayoutValues(readLayoutValues(celionEl));
        layoutChrome.showFor(celionEl);
        selectElement({
          text,
          pageId,
          element: manifestElement,
          selector: "",
          runtimeText: null,
          styleValues: readInspectorStyleValues(celionEl),
        });
        setCurrentSlide((current) => current === pageIndex ? current : pageIndex);
        return;
      }

      const runtimeTextEl = pickRuntimeTextElement(pointedElements, target);
      const textEl = runtimeTextEl ?? target.closest("[data-text-editable]") ?? (target.textContent?.trim() ? target : null);
      if (!textEl) return;

      const text = textEl.textContent?.trim() ?? "";
      if (!text) return;

      selectPreviewElement(textEl);
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
          styleValues: readInspectorStyleValues(textEl as HTMLElement),
        });
      } else {
        selectElement({
          text,
          pageId: "",
          element: null,
          selector: editableIndex >= 0 ? `${pageIdx}:${editableIndex}` : `[data-slide-index="${pageIdx}"] ${tag}`,
          runtimeText: null,
          styleValues: readInspectorStyleValues(textEl as HTMLElement),
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
        selectPreviewElement(selectedNode);
        setLayoutValues(readLayoutValues(selectedNode));
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
      pushUndoSnapshot(currentDocument);
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
    pushHtmlUndoSnapshot(html);
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

    pushUndoSnapshot(currentDocument);
    latestDocumentRef.current = styleEdit.value;
    setEbookDocument(styleEdit.value);
    if (selection.selectedElement) {
      applyLiveStyleToElement(selection.selectedPageId, selection.selectedElement, prop, value);
    }
    selection.setStyleValue(prop, value);
    void queueDocumentSave(styleEdit.value);
  };

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

    pushUndoSnapshot(currentDocument);
    latestDocumentRef.current = layoutEdit.value;
    setEbookDocument(layoutEdit.value);
    resetLiveLayoutForElement(target.pageId, target.element);
    void queueDocumentSave(layoutEdit.value);
  }, [latestDocumentRef, pushUndoSnapshot, queueDocumentSave, resetLiveLayoutForElement]);

  const undoLastEdit = useCallback(() => {
    const snapshot = undoStackRef.current.at(-1);
    if (!snapshot) return;

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);

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
  }, [latestDocumentRef, queueDocumentSave, saveHtml, selection, setLayoutTarget]);

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
    undoStackRef.current = [];
    setCanUndo(false);
    selection.clearSelection();
    editorModeRef.current = "view";
    setEditorMode("view");
    setSetupOpen(false);
  }, [latestDocumentRef, selection, setLayoutTarget]);

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
      <EditorTopBar
        projectTitle={displayTitle}
        saving={saving}
        saveError={saveError}
        exportError={exportError}
        exporting={exporting}
        exportOpen={exportOpen}
        canExport={!setupOpen}
        showModeToggle={!setupOpen && Boolean(html)}
        editorMode={editorMode}
        canUndo={canUndo}
        edgeGap={EDITOR_EDGE_GAP}
        topRailHeight={EDITOR_TOP_RAIL_HEIGHT}
        onModeChange={handleModeChange}
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
