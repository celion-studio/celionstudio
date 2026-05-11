"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import type { ProjectRecord, ProjectStatus } from "@/types/project";
import { WizardContent } from "@/components/wizard/WizardContent";
import { EBOOK_PAGE_SIZE_PX, EBOOK_PDF_A5_SIZE_PT } from "@/lib/ebook-format";
import { countCelionSlides } from "@/lib/ebook-html";
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
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
  appendScopedStyleToDocument,
  applyDocumentTextEdit,
  applyLegacyHtmlTextEdit,
} from "./editor-document-edits";
import {
  measurePreviewFrameHeight,
  preparePreviewFrame,
} from "./editor-preview-frame";
import {
  EditorInspectorPanel,
  EditorPageList,
  EditorPreviewPane,
  EditorTopBar,
  type ExportFormat,
} from "./editor-shell-panels";
import type { EditorMode, InspectorStyleValues } from "./editor-types";
import { clearEditorSelectionFromDocument } from "./export-cleanup";
import { useEditorSave } from "./use-editor-save";
import { useEditorSelection } from "./use-editor-selection";

const PREVIEW_WIDTH = 640;
const PAGE_HEIGHT: number = EBOOK_PAGE_SIZE_PX.height;
const PAGE_GAP = 28;
const PDF_A5_WIDTH_PT = EBOOK_PDF_A5_SIZE_PT.width;
const PDF_A5_HEIGHT_PT = EBOOK_PDF_A5_SIZE_PT.height;
const EDITOR_TOP_RAIL_HEIGHT = 56;
const EDITOR_EDGE_GAP = 16;

type Props = {
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  initialHtml: string;
  initialDocument: CelionEbookDocument | null;
};

function sanitizeExportFilename(value: string) {
  return (value.trim() || "celion-ebook")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
  const selection = useEditorSelection();
  const { selectElement } = selection;
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

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

  const handleIframeLoad = useCallback(() => {
    cleanupIframeEffects();

    const previewFrame = preparePreviewFrame(iframeRef.current, {
      previewWidth: PREVIEW_WIDTH,
      pageGap: PAGE_GAP,
    });
    if (!previewFrame) return;

    const { doc, pages } = previewFrame;
    setSlideCount((current) => current === pages.length ? current : pages.length);
    if (!ebookDocument) {
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

    const handleClick = (e: MouseEvent) => {
      if (editorModeRef.current !== "edit") return;

      const target = e.target as HTMLElement;
      const pointedElements = typeof doc.elementsFromPoint === "function"
        ? doc.elementsFromPoint(e.clientX, e.clientY)
        : [target];

      if (ebookDocument) {
        const pageEl = (pointedElements.find((element) => element.closest("[data-celion-page]")) ?? target)
          .closest<HTMLElement>("[data-celion-page]");
        const pageId = pageEl?.getAttribute("data-celion-page");
        if (!pageId) return;

        const pageIndex = ebookDocument.pages.findIndex((page) => page.id === pageId);
        const page = pageIndex >= 0 ? ebookDocument.pages[pageIndex] : null;
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

        const celionEl = doc.querySelector<HTMLElement>(manifestElement.selector);
        if (!celionEl) return;

        const text = celionEl.textContent?.trim() ?? "";

        selectPreviewElement(celionEl);
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

    doc.addEventListener("click", handleClick);
    iframeClickCleanupRef.current = () => {
      doc.removeEventListener("click", handleClick);
    };

    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measurePreview();
    });
    measureTimeoutRef.current = window.setTimeout(() => {
      measureTimeoutRef.current = null;
      measurePreview();
    }, 250);
  }, [cleanupIframeEffects, ebookDocument, measurePreview, selectElement]);

  useEffect(() => {
    if (!html || setupOpen) return;

    if (prepareFallbackRef.current !== null) {
      window.clearTimeout(prepareFallbackRef.current);
    }

    prepareFallbackRef.current = window.setTimeout(() => {
      prepareFallbackRef.current = null;
      handleIframeLoad();
    }, 120);

    return () => {
      if (prepareFallbackRef.current !== null) {
        window.clearTimeout(prepareFallbackRef.current);
        prepareFallbackRef.current = null;
      }
    };
  }, [handleIframeLoad, html, setupOpen]);

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

    const documentEdit = applyDocumentTextEdit({
      document: latestDocumentRef.current ?? ebookDocument,
      selectedPageId: selection.selectedPageId,
      selectedElement: selection.selectedElement,
      selectedRuntimeText: selection.selectedRuntimeText,
      editValue: selection.editValue,
    });
    if (documentEdit.ok) {
      const newHtml = compileEbookDocumentToHtml(documentEdit.value);
      setEbookDocument(documentEdit.value);
      setHtml(newHtml);
      selection.clearSelection();
      latestDocumentRef.current = documentEdit.value;
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
      editValue: selection.editValue,
    });
    if (!legacyEdit.ok) {
      if (legacyEdit.reason !== "not-applicable") {
        setSaveError("Could not find the selected text. Click it again and retry.");
      }
      return;
    }

    const newHtml = legacyEdit.value;
    setHtml(newHtml);
    selection.clearSelection();
    void saveHtml(newHtml);
  };

  const applyStyleToSelectedElement = (prop: string, value: string) => {
    const styleEdit = appendScopedStyleToDocument({
      document: latestDocumentRef.current ?? ebookDocument,
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

    const newHtml = compileEbookDocumentToHtml(styleEdit.value);
    latestDocumentRef.current = styleEdit.value;
    setEbookDocument(styleEdit.value);
    setHtml(newHtml);
    selection.setStyleValue(prop, value);
    void queueDocumentSave(styleEdit.value);
  };

  const exportAs = async (format: ExportFormat) => {
    setExportOpen(false);
    setExporting(true);
    setExportError("");
    try {
      const filename = sanitizeExportFilename(displayTitle);

      if (format === "html") {
        const exportHtml = latestDocumentRef.current
          ? compileEbookDocumentToHtml(latestDocumentRef.current)
          : html;
        if (!exportHtml.trim()) {
          throw new Error("No HTML content was found to export.");
        }
        downloadTextFile(`${filename}.html`, exportHtml, "text/html;charset=utf-8");
        return;
      }

      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) {
        throw new Error("Preview is not ready. Try again after it finishes loading.");
      }

      const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
      if (pages.length === 0) {
        throw new Error("No pages were found to export.");
      }

      const restoreSelection = clearEditorSelectionFromDocument(doc);
      const frameStyle = doc.getElementById("celion-preview-frame-style");
      const originalFrameStyle = frameStyle?.textContent ?? "";
      if (frameStyle) frameStyle.textContent = "";
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);

        if (format === "pdf") {
          const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" });
          for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
            if (i > 0) pdf.addPage("a5", "portrait");
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, PDF_A5_WIDTH_PT, PDF_A5_HEIGHT_PT);
          }
          pdf.save(`${filename}.pdf`);
        } else {
          for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
            const blob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (result) => result ? resolve(result) : reject(new Error("Could not prepare image export.")),
                format === "jpg" ? "image/jpeg" : "image/png",
                0.95,
              );
            });
            downloadBlob(`${filename}-page-${i + 1}.${format}`, blob);
          }
        }
      } finally {
        if (frameStyle) frameStyle.textContent = originalFrameStyle;
        restoreSelection();
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export ebook.");
    } finally {
      setExporting(false);
    }
  };

  const handlePageSelect = useCallback((index: number) => {
    scrollToPage(index);
  }, [scrollToPage]);

  const clearPreviewSelection = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      clearEditorSelectionFromDocument(doc);
    }
    selection.clearSelection();
  }, [selection]);

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
    selection.clearSelection();
    editorModeRef.current = "view";
    setEditorMode("view");
    setSetupOpen(false);
  }, [latestDocumentRef, selection]);

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
        edgeGap={EDITOR_EDGE_GAP}
        topRailHeight={EDITOR_TOP_RAIL_HEIGHT}
        onModeChange={handleModeChange}
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

            <div className="editor-preview-shell">
              <EditorPreviewPane
                html={html}
                width={PREVIEW_WIDTH}
                iframeHeight={iframeHeight}
                iframeRef={iframeRef}
                previewScrollRef={previewScrollRef}
                onIframeLoad={handleIframeLoad}
                onPreviewScroll={handlePreviewScroll}
              />
            </div>

            {editorMode === "edit" && (
              <EditorInspectorPanel
                selectedElement={selection.selectedElement}
                inspectorElement={selection.inspectorElement}
                editValue={selection.editValue}
                styleValues={selection.styleValues}
                topRailHeight={EDITOR_TOP_RAIL_HEIGHT}
                edgeGap={EDITOR_EDGE_GAP}
                onTextChange={selection.setEditValue}
                onApplyText={applyEdit}
                onStyleChange={applyStyleToSelectedElement}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
