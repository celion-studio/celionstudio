"use client";

import { FileText, ListTree } from "lucide-react";
import { getPageFormatSpec, type PageFormat, type PageSize } from "@/lib/page-format";
import { textFromNode, type TiptapBookDocument } from "@/lib/tiptap-document";

type EditorLeftPanelProps = {
  document: TiptapBookDocument;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  visualPageCount?: number;
};

export function EditorLeftPanel({
  document,
  pageFormat,
  customPageSize,
  visualPageCount,
}: EditorLeftPanelProps) {
  const pageCount = Math.max(1, visualPageCount ?? document.pages.length);
  const pages = Array.from({ length: pageCount }, (_, index) => {
    const sourcePage = document.pages[index];
    const nodes = sourcePage?.doc.content ?? [];
    const heading = nodes.find((node) => node.type === "heading");
    const lines = nodes.map(textFromNode).filter(Boolean).slice(0, 8);
    return {
      number: index + 1,
      title: heading ? textFromNode(heading) : `Page ${index + 1}`,
      nodes,
      lines,
    };
  });
  const pageSpec = getPageFormatSpec(pageFormat, customPageSize);
  const thumbnailHeight = Math.round((88 * pageSpec.heightMm) / pageSpec.widthMm);
  const headings = pages
    .flatMap((page) =>
      page.nodes
        .filter((node) => node.type === "heading")
        .map((node) => ({
          text: textFromNode(node),
          level: Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6),
          pageNumber: page.number,
        })),
    )
    .filter((heading) => heading.text)
    .slice(0, 14);

  return (
    <aside
      style={{
        height: "100%",
        borderRight: "1px solid #e8e4dd",
        background: "#f7f4ee",
        padding: "18px 16px 22px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          color: "#a19a90",
          fontFamily: "'Geist', sans-serif",
          fontSize: "10px",
          fontWeight: 650,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <FileText size={12} strokeWidth={1.8} />
        Pages
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {pages.map((page, index) => (
          <button
            key={`page-${page.number}`}
            type="button"
            style={{
              display: "grid",
              gridTemplateColumns: "88px minmax(0, 1fr)",
              gap: "10px",
              width: "100%",
              border: index === 0 ? "1px solid #bfb6a8" : "1px solid #e4ded3",
              borderRadius: "6px",
              background: index === 0 ? "#fffdf8" : "#fdfbf7",
              padding: "8px",
              textAlign: "left",
              boxShadow: index === 0 ? "0 8px 18px rgba(55, 42, 28, 0.08)" : "none",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: "88px",
                height: `${thumbnailHeight}px`,
                maxHeight: "132px",
                minHeight: "112px",
                border: "1px solid #e5dfd4",
                background: "#fff",
                padding: "11px 10px",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {(page.lines.length > 0 ? page.lines : [""]).map((line, lineIndex) => (
                <div
                  key={`${page.number}-line-${lineIndex}`}
                  style={{
                    height: lineIndex === 0 ? "6px" : "4px",
                    width: lineIndex === 0 ? "84%" : `${Math.max(38, Math.min(88, line.length * 3.4))}%`,
                    marginBottom: lineIndex === 0 ? "9px" : "7px",
                    background: lineIndex === 0 ? "#5b5147" : "#d7d0c5",
                    borderRadius: "999px",
                  }}
                />
              ))}
            </div>
            <div style={{ minWidth: 0, paddingTop: "2px" }}>
              <div
                style={{
                  marginBottom: "6px",
                  color: "#a19a90",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "10px",
                  fontWeight: 650,
                  textTransform: "uppercase",
                }}
              >
                Page {page.number}
              </div>
              <div
                style={{
                  color: "#1a1714",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {page.title}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  color: "#8d8378",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "11px",
                  lineHeight: 1.35,
                }}
              >
                {page.nodes.length} nodes
              </div>
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          color: "#a19a90",
          fontFamily: "'Geist', sans-serif",
          fontSize: "10px",
          fontWeight: 650,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <ListTree size={12} strokeWidth={1.8} />
        Outline
      </div>

      {headings.length > 0 ? (
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {headings.map((heading, index) => (
            <button
              key={`${heading.text}-${heading.pageNumber}-${index}`}
              type="button"
              style={{
                width: "100%",
                border: 0,
                background: "transparent",
                padding: "7px 0 7px " + (heading.level - 1) * 12 + "px",
                textAlign: "left",
                color: index === 0 ? "#1a1714" : "#6f665c",
                fontFamily: "'Geist', sans-serif",
                fontSize: "12.5px",
                lineHeight: 1.35,
                cursor: "default",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span>{heading.text}</span>
              <span style={{ float: "right", color: "#b8b0a5", fontSize: "11px" }}>
                {heading.pageNumber}
              </span>
            </button>
          ))}
        </nav>
      ) : (
        <p
          style={{
            margin: 0,
            color: "#b8b0a5",
            fontFamily: "'Geist', sans-serif",
            fontSize: "12.5px",
            lineHeight: 1.5,
          }}
        >
          Outline will appear here.
        </p>
      )}
    </aside>
  );
}
