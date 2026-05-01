"use client";

import type { RefObject } from "react";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import type { CelionEditableElement } from "@/lib/ebook-document";
import type { PageSummary } from "./editor-preview";
import { InspectorControls } from "./inspector-controls";

type ExportFormat = "pdf" | "png" | "jpg";

type TopBarProps = {
  projectTitle: string;
  saving: boolean;
  saveError: string;
  exportError: string;
  exporting: boolean;
  exportOpen: boolean;
  edgeGap: number;
  topRailHeight: number;
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
  edgeGap,
  topRailHeight,
  onToggleExport,
  onExport,
}: TopBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: `0 ${edgeGap}px`, height: `${topRailHeight}px`, background: "transparent", flexShrink: 0, boxSizing: "border-box" }}>
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#71717a", textDecoration: "none", fontSize: "13px" }}>
        <ArrowLeft size={14} />
        Back
      </Link>
      <span style={{ color: "#d4d2cc", fontSize: "13px" }}>/</span>
      <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#18181b", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectTitle}</span>
      {saving && <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Saving...</span>}
      {saveError && <span style={{ fontSize: "12px", color: "#b45309" }}>{saveError}</span>}
      {exportError && <span style={{ fontSize: "12px", color: "#b45309" }}>{exportError}</span>}

      <div style={{ position: "relative" }}>
        <button
          onClick={onToggleExport}
          disabled={exporting}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "6px", background: "#18181b", color: "#ffffff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
        >
          <Download size={13} />
          {exporting ? "Exporting..." : "Export"}
          <ChevronDown size={12} />
        </button>
        {exportOpen && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "8px", boxShadow: "none", overflow: "hidden", zIndex: 50, minWidth: "140px" }}>
            {(["pdf", "png", "jpg"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => onExport(fmt)}
                style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: "13px", color: "#18181b", background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}
                onMouseEnter={(event) => { event.currentTarget.style.background = "#f4f4f5"; }}
                onMouseLeave={(event) => { event.currentTarget.style.background = "none"; }}
              >
                Export as {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type PageListProps = {
  slideCount: number;
  currentSlide: number;
  pageSummaries: PageSummary[];
  onSelectPage: (index: number) => void;
};

export function EditorPageList({
  slideCount,
  currentSlide,
  pageSummaries,
  onSelectPage,
}: PageListProps) {
  return (
    <div style={{ width: "220px", background: "transparent", overflowY: "auto", padding: "14px 4px 14px 0", flexShrink: 0 }}>
      <p style={{ fontSize: "10px", fontWeight: 650, letterSpacing: "0.11em", color: "#a1a1aa", textTransform: "uppercase", marginBottom: "10px", paddingLeft: "6px" }}>
        {slideCount} slides
      </p>
      {Array.from({ length: slideCount }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelectPage(index)}
          style={{
            display: "grid",
            gridTemplateColumns: "28px minmax(0, 1fr)",
            gap: "8px",
            width: "100%",
            padding: "8px 9px",
            borderRadius: "6px",
            border: currentSlide === index ? "1px solid rgba(28,25,23,0.08)" : "1px solid transparent",
            background: currentSlide === index ? "rgba(255,255,255,0.72)" : "transparent",
            cursor: "pointer",
            marginBottom: "3px",
            textAlign: "left",
          }}
        >
          <span style={{ width: "28px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", background: currentSlide === index ? "#18181b" : "rgba(255,255,255,0.56)", color: currentSlide === index ? "#ffffff" : "#71717a", fontSize: "11px", fontWeight: 650, fontFamily: "'Geist', sans-serif", lineHeight: 1 }}>
            {index + 1}
          </span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 560, color: "#3f3f46", lineHeight: 1.25 }}>
              {pageSummaries[index]?.title || `Slide ${index + 1}`}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "10px", color: "#a1a1aa", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {pageSummaries[index]?.eyebrow || (index === 0 ? "Cover" : "Content")}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

type PreviewPaneProps = {
  html: string;
  width: number;
  iframeHeight: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  previewScrollRef: RefObject<HTMLDivElement | null>;
  onIframeLoad: () => void;
  onPreviewScroll: () => void;
};

export function EditorPreviewPane({
  html,
  width,
  iframeHeight,
  iframeRef,
  previewScrollRef,
  onIframeLoad,
  onPreviewScroll,
}: PreviewPaneProps) {
  return (
    <div ref={previewScrollRef} onScroll={onPreviewScroll} style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "40px 24px", background: "#f8f7f4" }}>
      <div style={{ width: `${width}px` }}>
        {html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={onIframeLoad}
            scrolling="no"
            style={{ width: `${width}px`, height: `${iframeHeight}px`, border: "none", display: "block", overflow: "hidden" }}
            sandbox="allow-same-origin"
            title="Ebook preview"
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "#a1a1aa", fontSize: "14px" }}>
            No ebook content yet.
          </div>
        )}
      </div>
    </div>
  );
}

type InspectorPanelProps = {
  selectedElement: CelionEditableElement | null;
  inspectorElement: CelionEditableElement | null;
  editValue: string;
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
  topRailHeight,
  edgeGap,
  onTextChange,
  onApplyText,
  onStyleChange,
}: InspectorPanelProps) {
  return (
    <div style={{ width: "286px", minHeight: `calc(100vh - ${topRailHeight + edgeGap}px)`, background: "#ffffff", border: "1px solid rgba(28,25,23,0.08)", borderRadius: "12px", padding: "16px", flexShrink: 0, overflowY: "auto", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 650, letterSpacing: "0.06em", textTransform: "uppercase", color: "#71717a", margin: 0 }}>
          Inspector
        </h3>
        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
          {selectedElement?.role || "None"}
        </span>
      </div>
      <InspectorControls
        element={inspectorElement}
        textValue={editValue}
        onTextChange={onTextChange}
        onApplyText={onApplyText}
        onStyleChange={onStyleChange}
      />
    </div>
  );
}
