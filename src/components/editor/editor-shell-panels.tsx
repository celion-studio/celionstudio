"use client";

import { memo, type CSSProperties, type RefObject } from "react";
import { ArrowLeft, ChevronDown, Download, ImagePlus, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { CelionEditableElement } from "@/lib/slide-document";
import { CelionButton, CelionSegmentedControl } from "@/components/ui/celion-controls";
import type { SlideSummary } from "./editor-preview";
import type { EditorMode, InspectorLayoutValues, InspectorStyleValues } from "./editor-types";
import { InspectorControls } from "./inspector-controls";

export type ExportFormat = "pdf" | "png" | "jpg" | "html";

type TopBarProps = {
  projectTitle: string;
  saveError: string;
  exportError: string;
  saving: boolean;
  exporting: boolean;
  exportOpen: boolean;
  exportProgress: { current: number; total: number } | null;
  canExport?: boolean;
  canAddImage?: boolean;
  showModeToggle?: boolean;
  editorMode: EditorMode;
  canUndo: boolean;
  edgeGap: number;
  topRailHeight: number;
  onModeChange: (mode: EditorMode) => void;
  onAddImage: () => void;
  onUndo: () => void;
  onToggleExport: () => void;
  onExport: (format: ExportFormat) => void;
  onDismissSaveError: () => void;
  onDismissExportError: () => void;
};

export function EditorTopBar({
  projectTitle,
  saveError,
  exportError,
  saving,
  exporting,
  exportOpen,
  exportProgress,
  canExport = true,
  canAddImage = true,
  showModeToggle = true,
  editorMode,
  canUndo,
  edgeGap,
  topRailHeight,
  onModeChange,
  onAddImage,
  onUndo,
  onToggleExport,
  onExport,
  onDismissSaveError,
  onDismissExportError,
}: TopBarProps) {
  return (
    <div
      className="editor-topbar"
      style={{
        "--editor-edge-gap": `${edgeGap}px`,
        "--editor-top-rail-height": `${topRailHeight}px`,
      } as CSSProperties}
    >
      <div className="editor-topbar-left">
        <Link href="/dashboard" prefetch={false} className="editor-back-link">
          <ArrowLeft size={14} />
          Back
        </Link>
        <span className="editor-breadcrumb-separator">/</span>
        <span className="editor-project-title">{projectTitle}</span>
      </div>

      {showModeToggle ? (
        <EditorModeToggle mode={editorMode} onModeChange={onModeChange} />
      ) : (
        <span aria-hidden="true" />
      )}

      <div className="editor-topbar-right">
        <AnimatePresence initial={false}>
          {showModeToggle && editorMode === "edit" && (
            <motion.div
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className="editor-edit-actions"
              exit={{ opacity: 0, x: 6, scale: 0.98 }}
              initial={{ opacity: 0, x: 6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <CelionButton
                onClick={onAddImage}
                disabled={!canAddImage}
                size="sm"
                variant="ghost"
              >
                <ImagePlus size={13} />
                Image
              </CelionButton>
              <CelionButton
                onClick={onUndo}
                disabled={!canUndo}
                size="sm"
                variant="ghost"
              >
                <Undo2 size={13} />
                Undo
              </CelionButton>
            </motion.div>
          )}
        </AnimatePresence>
        {saving && <span className="editor-status editor-status-saving">Saving...</span>}
        {saveError && (
          <span className="editor-status editor-status-error">
            {saveError}
            <button
              type="button"
              className="editor-status-dismiss"
              onClick={onDismissSaveError}
              aria-label="Dismiss save error"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        )}
        {exportError && (
          <span className="editor-status editor-status-error">
            {exportError}
            <button
              type="button"
              className="editor-status-dismiss"
              onClick={onDismissExportError}
              aria-label="Dismiss export error"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        )}

        <div className="editor-export-anchor">
          <CelionButton
            onClick={onToggleExport}
            disabled={exporting || !canExport}
            size="sm"
            variant="primary"
          >
            <Download size={13} />
            {exporting
              ? exportProgress
                ? `Exporting ${exportProgress.current}/${exportProgress.total}`
                : "Exporting..."
              : "Export"}
            <ChevronDown size={12} />
          </CelionButton>
          <AnimatePresence>
            {exportOpen && (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="editor-export-menu"
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
              {(["pdf", "html", "png", "jpg"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => onExport(fmt)}
                  className="editor-export-option"
                >
                  Export as {fmt.toUpperCase()}
                </button>
              ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function EditorModeToggle({
  mode,
  onModeChange,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}) {
  return (
    <CelionSegmentedControl
      ariaLabel="Editor mode"
      onChange={onModeChange}
      options={[
        { value: "view", label: "View" },
        { value: "edit", label: "Edit" },
      ]}
      tone="dark"
      value={mode}
      width="148px"
    />
  );
}

type PageListProps = {
  slideCount: number;
  currentSlide: number;
  slideSummaries: SlideSummary[];
  onSelectPage: (index: number) => void;
};

function EditorSlideListComponent({
  slideCount,
  currentSlide,
  slideSummaries,
  onSelectPage,
}: PageListProps) {
  return (
    <div className="editor-page-list">
      <div className="editor-page-list-head">
        <p className="editor-page-list-count">
          {slideCount} pages
        </p>
      </div>
      {Array.from({ length: slideCount }).map((_, index) => (
        <motion.button
          key={index}
          layout
          onClick={() => onSelectPage(index)}
          className="editor-page-list-item"
          data-active={currentSlide === index ? "true" : "false"}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.985 }}
        >
          <span className="editor-page-index">
            {index + 1}
          </span>
          <span className="editor-page-copy">
            <span className="editor-page-title">
              {slideSummaries[index]?.title || `Page ${index + 1}`}
            </span>
            <span className="editor-page-role">
              {slideSummaries[index]?.eyebrow || (index === 0 ? "Cover" : "Content")}
            </span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}

export const EditorSlideList = memo(EditorSlideListComponent);

type PreviewPaneProps = {
  html: string;
  width: number;
  iframeHeight: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewScrollRef: RefObject<HTMLDivElement | null>;
  onIframeLoad: () => void;
  onPreviewScroll: () => void;
};

function EditorPreviewPaneComponent({
  html,
  width,
  iframeHeight,
  iframeRef,
  previewScrollRef,
  onIframeLoad,
  onPreviewScroll,
}: PreviewPaneProps) {
  return (
    <div ref={previewScrollRef} onScroll={onPreviewScroll} className="editor-preview-pane">
      <div
        className="editor-preview-page"
        style={{ "--editor-preview-width": `${width}px` } as CSSProperties}
      >
        {html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={onIframeLoad}
            scrolling="no"
            className="editor-preview-frame"
            style={{
              "--editor-iframe-height": `${iframeHeight}px`,
            } as CSSProperties}
            sandbox="allow-same-origin"
            title="Project preview"
          />
        ) : (
          <div className="editor-preview-empty">
            No content yet.
          </div>
        )}
      </div>
    </div>
  );
}

export const EditorPreviewPane = memo(EditorPreviewPaneComponent);

type InspectorPanelProps = {
  selectedElement: CelionEditableElement | null;
  inspectorElement: CelionEditableElement | null;
  layoutTargetLabel: string;
  layoutValues: InspectorLayoutValues | null;
  editValue: string;
  styleValues: InspectorStyleValues;
  topRailHeight: number;
  edgeGap: number;
  onTextChange: (value: string) => void;
  onApplyText: () => void;
  onStyleChange: (prop: string, value: string) => void;
  onLayoutChange: (prop: keyof InspectorLayoutValues, value: number) => void;
  onResetLayout: () => void;
};

export function EditorInspectorPanel({
  selectedElement,
  inspectorElement,
  layoutTargetLabel,
  layoutValues,
  editValue,
  styleValues,
  topRailHeight,
  edgeGap,
  onTextChange,
  onApplyText,
  onStyleChange,
  onLayoutChange,
  onResetLayout,
}: InspectorPanelProps) {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
      className="editor-inspector-panel"
      exit={{ opacity: 0, x: 28, scale: 0.985, filter: "blur(3px)" }}
      initial={{ opacity: 0, x: 28, scale: 0.985, filter: "blur(3px)" }}
      layout
      style={{
        "--editor-inspector-min-height": `calc(100vh - ${topRailHeight + edgeGap}px)`,
      } as CSSProperties}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="editor-inspector-head">
        <h3 className="editor-inspector-title">
          Inspector
        </h3>
        <span className="editor-inspector-role">
          {selectedElement?.role || "None"}
        </span>
      </div>
      <InspectorControls
        element={inspectorElement}
        layoutTargetLabel={layoutTargetLabel}
        layoutValues={layoutValues}
        textValue={editValue}
        styleValues={styleValues}
        onTextChange={onTextChange}
        onApplyText={onApplyText}
        onStyleChange={onStyleChange}
        onLayoutChange={onLayoutChange}
        onResetLayout={onResetLayout}
      />
    </motion.div>
  );
}
