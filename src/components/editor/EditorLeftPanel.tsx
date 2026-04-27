"use client";

import { FileText } from "lucide-react";
import { getPageFormatSpec, type PageFormat, type PageSize } from "@/lib/page-format";
import type { TiptapBookDocument } from "@/lib/tiptap-document";

type EditorLeftPanelProps = {
  document: TiptapBookDocument;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  visualPageCount?: number;
};

const panelFont = "'Geist', sans-serif";

export function EditorLeftPanel({
  document,
  pageFormat,
  customPageSize,
  visualPageCount,
}: EditorLeftPanelProps) {
  const pageCount = Math.max(1, visualPageCount ?? document.pages.length);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const pageSpec = getPageFormatSpec(pageFormat, customPageSize);
  const thumbnailWidth = 126;
  const thumbnailHeight = Math.round((thumbnailWidth * pageSpec.heightMm) / pageSpec.widthMm);
  const previewHeight = Math.max(150, Math.min(thumbnailHeight, 176));

  return (
    <aside
      style={{
        height: "100%",
        borderRight: "1px solid #e4ded4",
        background: "#f7f4ee",
        padding: "20px 18px 24px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={13} strokeWidth={1.8} style={{ color: "#17130f" }} />
          <span
            style={{
              color: "#17130f",
              fontFamily: panelFont,
              fontSize: "10px",
              fontWeight: 650,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Pages
          </span>
        </div>
        <span
          style={{
            color: "#8d8579",
            fontFamily: panelFont,
            fontSize: "11px",
            fontWeight: 560,
          }}
        >
          {pageCount}
        </span>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        {pages.map((pageNumber, index) => {
          const isActive = index === 0;
          return (
            <button
              key={`page-${pageNumber}`}
              type="button"
              style={{
                width: "100%",
                border: 0,
                background: "transparent",
                padding: 0,
                textAlign: "left",
                cursor: "default",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 8px 12px",
                  border: isActive ? "1px solid #b9ae9f" : "1px solid #e9e3da",
                  borderRadius: "8px",
                  background: isActive ? "#fffdf8" : "#f9f6f0",
                  boxShadow: isActive ? "0 14px 30px rgba(39, 29, 18, 0.07)" : "none",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: `${thumbnailWidth}px`,
                    height: `${previewHeight}px`,
                    border: "1px solid #ded7cb",
                    borderRadius: "3px",
                    background: "#fffefa",
                    boxShadow: "0 10px 22px rgba(40, 31, 22, 0.06)",
                    padding: "18px 15px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: "#b8afa4",
                      fontFamily: panelFont,
                      fontSize: "8px",
                      fontWeight: 650,
                    }}
                  >
                    {pageNumber}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: "38px",
                      left: "16px",
                      right: "16px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    {[74, 58, 84, 45, 67].map((width, lineIndex) => (
                      <div
                        key={`${pageNumber}-line-${lineIndex}`}
                        style={{
                          height: lineIndex === 0 ? "6px" : "4px",
                          width: `${width}%`,
                          borderRadius: "999px",
                          background: lineIndex === 0 ? "#312c26" : "#ddd6cc",
                          opacity: pageNumber === 1 ? 1 : 0.42,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    color: isActive ? "#17130f" : "#8f877d",
                    fontFamily: panelFont,
                    fontSize: "11px",
                    fontWeight: 620,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Page {pageNumber}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
