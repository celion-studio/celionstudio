"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowLeft, Download, ChevronDown } from "lucide-react";
import Link from "next/link";
import { countCelionSlides, sanitizeEbookHtmlForCanvas } from "@/lib/ebook-html";
import { clearBuilderSelectionFromDocument } from "./export-cleanup";

const PREVIEW_WIDTH = 640;
const PAGE_HEIGHT = 794;
const PAGE_GAP = 18;
const PDF_A5_WIDTH_PT = 419.53;
const PDF_A5_HEIGHT_PT = 595.28;

type PageSummary = {
  title: string;
  eyebrow: string;
};

type Props = {
  projectId: string;
  projectTitle: string;
  initialHtml: string;
};

function normalizeBuilderHtml(html: string) {
  return sanitizeEbookHtmlForCanvas(html)
    .replace(/\bdata-page=/g, "data-slide=")
    .replace(/class=(["'])([^"']*)\bpage\b([^"']*)\1/g, (_match, quote: string, before: string, after: string) => {
      const classes = `${before} slide ${after}`.trim().replace(/\s+/g, " ");
      return `class=${quote}${classes}${quote}`;
    })
    .replace(/\.page(?![-\w])/g, ".slide");
}

export function BuilderShell({ projectId, projectTitle, initialHtml }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const iframeClickCleanupRef = useRef<(() => void) | null>(null);
  const measureTimeoutRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const [html, setHtml] = useState(() => normalizeBuilderHtml(initialHtml));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(PAGE_HEIGHT);
  const [pageSummaries, setPageSummaries] = useState<PageSummary[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectedSelector, setSelectedSelector] = useState("");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Count pages from html
  useEffect(() => {
    setSlideCount(countCelionSlides(html));
  }, [html]);

  const measurePreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
    const lastPage = pages.at(-1);
    const measuredHeight = lastPage
      ? lastPage.offsetTop + lastPage.offsetHeight + 40
      : doc.documentElement.scrollHeight;
    const deterministicHeight = pages.length > 0
      ? pages.length * (PAGE_HEIGHT + PAGE_GAP) + 40
      : PAGE_HEIGHT;

    setIframeHeight(Math.max(PAGE_HEIGHT, Math.ceil(measuredHeight), deterministicHeight));
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
  }, []);

  useEffect(() => cleanupIframeEffects, [cleanupIframeEffects]);

  const handleIframeLoad = useCallback(() => {
    cleanupIframeEffects();

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
    doc.body.style.margin = "0";
    doc.body.style.minWidth = `${PREVIEW_WIDTH}px`;

    let frameStyle = doc.getElementById("celion-preview-frame-style");
    if (!frameStyle) {
      frameStyle = doc.createElement("style");
      frameStyle.id = "celion-preview-frame-style";
      doc.head.appendChild(frameStyle);
    }
    frameStyle.textContent = `
      html, body { overflow: hidden !important; width: 100% !important; }
      body { background: transparent !important; }
      .slide:first-of-type { margin-top: 0 !important; }
      [data-selected="true"] { outline-offset: 2px !important; }
    `;

    const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
    setSlideCount(pages.length);
    setPageSummaries(pages.map((page, i) => {
      const title =
        page.querySelector("h1, h2, h3")?.textContent?.trim() ||
        page.querySelector("[data-text-editable]")?.textContent?.trim() ||
        `Page ${i + 1}`;
      const eyebrow =
        page.querySelector(".eyebrow, .kicker")?.textContent?.trim() ||
        (i === 0 ? "Cover" : `Page ${i + 1}`);

      return {
        title: title.slice(0, 42),
        eyebrow: eyebrow.slice(0, 24),
      };
    }));

    pages.forEach((page, i) => {
      page.style.cursor = "default";
      page.setAttribute("data-slide-index", String(i));
      page.querySelectorAll<HTMLElement>("[data-text-editable]").forEach((editable, editableIndex) => {
        editable.setAttribute("data-celion-edit-id", `slide-${i}-text-${editableIndex}`);
      });
    });

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textEl = target.closest("[data-text-editable]") ?? (target.textContent?.trim() ? target : null);
      if (!textEl) return;

      const text = textEl.textContent?.trim() ?? "";
      if (!text) return;

      doc.querySelectorAll("[data-selected]").forEach((el) => {
        el.removeAttribute("data-selected");
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      });
      textEl.setAttribute("data-selected", "true");
      (textEl as HTMLElement).style.outline = "2px solid #6366f1";
      (textEl as HTMLElement).style.outlineOffset = "2px";

      setSelectedText(text);
      setEditValue(text);

      const tag = textEl.tagName.toLowerCase();
      const pageEl = textEl.closest(".slide");
      const pageIdx = pageEl?.getAttribute("data-slide-index") ?? "0";
      const editableIndex = pageEl
        ? Array.from(pageEl.querySelectorAll("[data-text-editable]")).indexOf(textEl)
        : -1;
      setCurrentSlide(Number(pageIdx));
      setSelectedSelector(editableIndex >= 0 ? `${pageIdx}:${editableIndex}` : `[data-slide-index="${pageIdx}"] ${tag}`);
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
  }, [cleanupIframeEffects, measurePreview]);

  const scrollToPage = useCallback((index: number) => {
    setCurrentSlide(index);
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

    setCurrentSlide(nearest.index);
  }, []);

  const applyEdit = () => {
    if (!editValue.trim() || !selectedText || !selectedSelector) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const [slideIndexRaw, editableIndexRaw] = selectedSelector.split(":");
    const slideIndex = Number(slideIndexRaw);
    const editableIndex = Number(editableIndexRaw);
    const target = Number.isFinite(slideIndex) && Number.isFinite(editableIndex)
      ? doc.querySelectorAll<HTMLElement>(".slide")[slideIndex]?.querySelectorAll<HTMLElement>("[data-text-editable]")[editableIndex]
      : doc.querySelector(selectedSelector);
    if (!target) {
      setSaveError("Could not find the selected text. Click it again and retry.");
      return;
    }

    target.textContent = editValue.trim();
    const newHtml = normalizeBuilderHtml(`<!doctype html>\n${doc.documentElement.outerHTML}`);
    setHtml(newHtml);
    setSelectedText("");
    setEditValue("");
    setSelectedSelector("");
    void saveHtml(newHtml);
  };

  const saveHtml = async (newHtml: string) => {
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/ebook/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, html: newHtml }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "" })) as { message?: string };
        throw new Error(data.message || "Could not save ebook changes.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save ebook changes.");
    } finally {
      setSaving(false);
    }
  };

  const exportAs = async (format: "pdf" | "png" | "jpg") => {
    setExportOpen(false);
    setExporting(true);
    setExportError("");
    try {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) {
        throw new Error("Preview is not ready. Try again after it finishes loading.");
      }

      const pages = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
      if (pages.length === 0) {
        throw new Error("No pages were found to export.");
      }

      const restoreSelection = clearBuilderSelectionFromDocument(doc);
      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
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
          pdf.save(`${projectTitle}.pdf`);
        } else {
          for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
            const link = document.createElement("a");
            link.download = `${projectTitle}-page-${i + 1}.${format}`;
            link.href = canvas.toDataURL(format === "jpg" ? "image/jpeg" : "image/png", 0.95);
            link.click();
          }
        }
      } finally {
        restoreSelection();
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not export ebook.");
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
        {saveError && <span style={{ fontSize: "12px", color: "#b45309" }}>{saveError}</span>}
        {exportError && <span style={{ fontSize: "12px", color: "#b45309" }}>{exportError}</span>}

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
        <div style={{ width: "220px", background: "#ffffff", borderRight: "1px solid #e4e4e7", overflowY: "auto", padding: "14px 10px", flexShrink: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 650, letterSpacing: "0.11em", color: "#a1a1aa", textTransform: "uppercase", marginBottom: "10px", paddingLeft: "6px" }}>
            {slideCount} slides
          </p>
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentSlide(i);
                scrollToPage(i);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "28px minmax(0, 1fr)",
                gap: "8px",
                width: "100%",
                padding: "8px 9px",
                borderRadius: "6px",
                border: currentSlide === i ? "1px solid #d4d4d8" : "1px solid transparent",
                background: currentSlide === i ? "#f7f7f8" : "transparent",
                cursor: "pointer",
                marginBottom: "3px",
                textAlign: "left",
              }}
            >
              <span style={{ width: "28px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", background: currentSlide === i ? "#18181b" : "#f4f4f5", color: currentSlide === i ? "#ffffff" : "#71717a", fontSize: "11px", fontWeight: 650, fontFamily: "'Geist', sans-serif", lineHeight: 1 }}>
                {i + 1}
              </span>
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 560, color: "#3f3f46", lineHeight: 1.25 }}>
                  {pageSummaries[i]?.title || `Slide ${i + 1}`}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "10px", color: "#a1a1aa", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {pageSummaries[i]?.eyebrow || (i === 0 ? "Cover" : "Content")}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Center: iframe preview */}
        <div ref={previewScrollRef} onScroll={handlePreviewScroll} style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "40px 24px", background: "#f5f5f6" }}>
          <div style={{ width: `${PREVIEW_WIDTH}px` }}>
            {html ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                scrolling="no"
                style={{ width: `${PREVIEW_WIDTH}px`, height: `${iframeHeight}px`, border: "none", display: "block", overflow: "hidden" }}
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
