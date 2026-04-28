"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowLeft, Download, ChevronDown } from "lucide-react";
import Link from "next/link";

type Props = {
  projectId: string;
  projectTitle: string;
  initialHtml: string;
};

export function BuilderShell({ projectId, projectTitle, initialHtml }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState(initialHtml);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [selectedSelector, setSelectedSelector] = useState("");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Count pages from html
  useEffect(() => {
    const matches = html.match(/<div[^>]+class="[^"]*page[^"]*"/g);
    setPageCount(matches?.length ?? 0);
  }, [html]);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;

    doc.querySelectorAll(".page").forEach((page, i) => {
      (page as HTMLElement).style.cursor = "default";
      (page as HTMLElement).setAttribute("data-page-index", String(i));
    });

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textEl = target.closest("[data-text-editable]") ?? (target.textContent?.trim() ? target : null);
      if (!textEl) return;

      const text = textEl.textContent?.trim() ?? "";
      if (!text) return;

      doc.querySelectorAll("[data-selected]").forEach((el) => el.removeAttribute("data-selected"));
      textEl.setAttribute("data-selected", "true");
      (textEl as HTMLElement).style.outline = "2px solid #6366f1";
      (textEl as HTMLElement).style.outlineOffset = "2px";

      setSelectedText(text);
      setEditValue(text);

      const tag = textEl.tagName.toLowerCase();
      const pageEl = textEl.closest(".page");
      const pageIdx = pageEl?.getAttribute("data-page-index") ?? "0";
      setSelectedSelector(`[data-page-index="${pageIdx}"] ${tag}`);
    };

    doc.addEventListener("click", handleClick);
  }, []);

  const applyEdit = () => {
    if (!editValue.trim() || !selectedText) return;
    const newHtml = html.replace(selectedText, editValue.trim());
    setHtml(newHtml);
    setSelectedText("");
    setEditValue("");
    setSelectedSelector("");
    saveHtml(newHtml);
  };

  const saveHtml = async (newHtml: string) => {
    setSaving(true);
    try {
      await fetch(`/api/ebook/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, html: newHtml }),
      });
    } finally {
      setSaving(false);
    }
  };

  const exportAs = async (format: "pdf" | "png" | "jpg") => {
    setExportOpen(false);
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) return;
      const pages = iframe.contentDocument.querySelectorAll(".page");

      if (format === "pdf") {
        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, 1123] });
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true });
          if (i > 0) pdf.addPage([794, 1123], "portrait");
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 794, 1123);
        }
        pdf.save(`${projectTitle}.pdf`);
      } else {
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true });
          const link = document.createElement("a");
          link.download = `${projectTitle}-page-${i + 1}.${format}`;
          link.href = canvas.toDataURL(format === "jpg" ? "image/jpeg" : "image/png", 0.95);
          link.click();
        }
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f4f4f5", fontFamily: "'Geist', sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 20px", height: "52px", background: "#ffffff", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#71717a", textDecoration: "none", fontSize: "13px" }}>
          <ArrowLeft size={14} />
          Back
        </Link>
        <div style={{ width: "1px", height: "20px", background: "#e4e4e7" }} />
        <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#18181b", flex: 1 }}>{projectTitle}</span>
        {saving && <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Saving...</span>}

        {/* Export dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "6px", background: "#18181b", color: "#ffffff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
          >
            <Download size={13} />
            {exporting ? "Exporting..." : "Export"}
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", overflow: "hidden", zIndex: 50, minWidth: "140px" }}>
              {(["pdf", "png", "jpg"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => exportAs(fmt)}
                  style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: "13px", color: "#18181b", background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#f4f4f5"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "none"; }}
                >
                  Export as {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: page list */}
        <div style={{ width: "160px", background: "#ffffff", borderRight: "1px solid #e4e4e7", overflowY: "auto", padding: "12px 8px", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "#a1a1aa", textTransform: "uppercase", marginBottom: "8px", paddingLeft: "4px" }}>
            {pageCount} pages
          </p>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentPage(i);
                const iframe = iframeRef.current;
                if (!iframe?.contentDocument) return;
                const pages = iframe.contentDocument.querySelectorAll(".page");
                pages[i]?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "none",
                background: currentPage === i ? "#f4f4f5" : "transparent",
                cursor: "pointer",
                marginBottom: "4px",
                textAlign: "left",
              }}
            >
              <div style={{ width: "36px", height: "50px", borderRadius: "3px", background: "#f4f4f5", border: "1px solid #e4e4e7", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "#71717a", fontFamily: "'Geist', sans-serif" }}>
                {i + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Center: iframe preview */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "32px 24px" }}>
          <div style={{ width: "794px" }}>
            {html ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ width: "794px", border: "none", display: "block", boxShadow: "0 4px 40px rgba(0,0,0,0.12)" }}
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

        {/* Right: edit panel */}
        <div style={{ width: "260px", background: "#ffffff", borderLeft: "1px solid #e4e4e7", padding: "16px", flexShrink: 0, overflowY: "auto" }}>
          <h3 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#a1a1aa", marginBottom: "12px" }}>
            Text Editor
          </h3>
          {selectedText ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ fontSize: "11.5px", color: "#71717a" }}>Selected text:</p>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={6}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1.5px solid #e4e4e7", fontSize: "13px", fontFamily: "'Geist', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e4e4e7"; }}
              />
              <button
                onClick={applyEdit}
                disabled={!editValue.trim() || editValue === selectedText}
                style={{ padding: "8px 14px", borderRadius: "6px", background: "#18181b", color: "#ffffff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500, opacity: (!editValue.trim() || editValue === selectedText) ? 0.4 : 1 }}
              >
                Apply change
              </button>
              <button
                onClick={() => { setSelectedText(""); setEditValue(""); setSelectedSelector(""); }}
                style={{ padding: "8px 14px", borderRadius: "6px", background: "transparent", color: "#71717a", border: "1px solid #e4e4e7", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <p style={{ fontSize: "12.5px", color: "#a1a1aa", lineHeight: 1.6 }}>
              Click on any text in the preview to edit it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
