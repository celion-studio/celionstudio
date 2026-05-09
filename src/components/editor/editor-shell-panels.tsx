"use client";

import { memo, type CSSProperties, type RefObject } from "react";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import type { CelionEditableElement } from "@/lib/ebook-document";
import { CelionButton, CelionSegmentedControl } from "@/components/ui/celion-controls";
import type { PageSummary } from "./editor-preview";
import type { EditorMode, InspectorStyleValues } from "./editor-types";
import { InspectorControls } from "./inspector-controls";

export type ExportFormat = "pdf" | "png" | "jpg" | "html";

type TopBarProps = {
  projectTitle: string;
  saving: boolean;
  saveError: string;
  exportError: string;
  exporting: boolean;
  exportOpen: boolean;
  canExport?: boolean;
  showModeToggle?: boolean;
  editorMode: EditorMode;
  edgeGap: number;
  topRailHeight: number;
  onModeChange: (mode: EditorMode) => void;
  onToggleExport: () => void;
  onExport: (format: ExportFormat) => void;
};

export function EditorTopBar({
  projectTitle,
  saving,
  saveError,
  exportError,
  exporting,
  exportOpen,
  canExport = true,
  showModeToggle = true,
  editorMode,
  edgeGap,
  topRailHeight,
  onModeChange,
  onToggleExport,
  onExport,
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
        <Link href="/dashboard" className="editor-back-link">
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
        {saving && <span className="editor-status">Saving...</span>}
        {saveError && <span className="editor-status editor-status-error">{saveError}</span>}
        {exportError && <span className="editor-status editor-status-error">{exportError}</span>}

        <div className="editor-export-anchor">
          <CelionButton
            onClick={onToggleExport}
            disabled={exporting || !canExport}
            size="sm"
            variant="primary"
          >
            <Download size={13} />
            {exporting ? "Exporting..." : "Export"}
            <ChevronDown size={12} />
          </CelionButton>
          {exportOpen && (
            <div className="editor-export-menu">
              {(["pdf", "html", "png", "jpg"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => onExport(fmt)}
                  className="editor-export-option"
                >
                  Export as {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
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
  pageSummaries: PageSummary[];
  onSelectPage: (index: number) => void;
};

function EditorPageListComponent({
  slideCount,
  currentSlide,
  pageSummaries,
  onSelectPage,
}: PageListProps) {
  return (
    <div className="editor-page-list">
      <p className="editor-page-list-count">
        {slideCount} pages
      </p>
      {Array.from({ length: slideCount }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelectPage(index)}
          className="editor-page-list-item"
          data-active={currentSlide === index ? "true" : "false"}
        >
          <span className="editor-page-index">
            {index + 1}
          </span>
          <span className="editor-page-copy">
            <span className="editor-page-title">
              {pageSummaries[index]?.title || `Page ${index + 1}`}
            </span>
            <span className="editor-page-role">
              {pageSummaries[index]?.eyebrow || (index === 0 ? "Cover" : "Content")}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export const EditorPageList = memo(EditorPageListComponent);

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
  editValue: string;
  styleValues: InspectorStyleValues;
  topRailHeight: number;
  edgeGap: number;
  onTextChange: (value: string) => void;
  onApplyText: () => void;
  onStyleChange: (prop: string, value: string) => void;
};

export function EditorInspectorPanel({
  selectedElement,
  inspectorElement,
  editValue,
  styleValues,
  topRailHeight,
  edgeGap,
  onTextChange,
  onApplyText,
  onStyleChange,
}: InspectorPanelProps) {
  return (
    <div
      className="editor-inspector-panel"
      style={{
        "--editor-inspector-min-height": `calc(100vh - ${topRailHeight + edgeGap}px)`,
      } as CSSProperties}
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
        textValue={editValue}
        styleValues={styleValues}
        onTextChange={onTextChange}
        onApplyText={onApplyText}
        onStyleChange={onStyleChange}
      />
    </div>
  );
}
