"use client";

import { useCallback, useState, type RefObject } from "react";
import { compileEbookDocumentToHtml, type CelionEbookDocument } from "@/lib/ebook-document";
import { EBOOK_PDF_A5_SIZE_PT } from "@/lib/ebook-format";
import type { ExportFormat } from "./editor-shell-panels";
import { clearEditorSelectionFromDocument, stripEditorMetadataFromHtml } from "./export-cleanup";

const PDF_A5_WIDTH_PT = EBOOK_PDF_A5_SIZE_PT.width;
const PDF_A5_HEIGHT_PT = EBOOK_PDF_A5_SIZE_PT.height;

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

type UseEditorExportArgs = {
  displayTitle: string;
  html: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  latestDocumentRef: RefObject<CelionEbookDocument | null>;
};

export function useEditorExport({
  displayTitle,
  html,
  iframeRef,
  latestDocumentRef,
}: UseEditorExportArgs) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const exportAs = useCallback(async (format: ExportFormat) => {
    setExportOpen(false);
    setExporting(true);
    setExportError("");
    setExportProgress(null);
    try {
      const filename = sanitizeExportFilename(displayTitle);

      if (format === "html") {
        const exportHtml = latestDocumentRef.current
          ? compileEbookDocumentToHtml(latestDocumentRef.current)
          : html;
        if (!exportHtml.trim()) {
          throw new Error("No HTML content was found to export.");
        }
        downloadTextFile(`${filename}.html`, stripEditorMetadataFromHtml(exportHtml), "text/html;charset=utf-8");
        return;
      }

      const doc = iframeRef.current?.contentDocument;
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
            setExportProgress({ current: i + 1, total: pages.length });
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
            if (i > 0) pdf.addPage("a5", "portrait");
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, PDF_A5_WIDTH_PT, PDF_A5_HEIGHT_PT);
          }
          pdf.save(`${filename}.pdf`);
        } else {
          for (let i = 0; i < pages.length; i++) {
            setExportProgress({ current: i + 1, total: pages.length });
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
      setExportProgress(null);
    }
  }, [displayTitle, html, iframeRef, latestDocumentRef]);

  return {
    exportOpen,
    exporting,
    exportError,
    exportProgress,
    setExportOpen,
    setExportError,
    exportAs,
  };
}
