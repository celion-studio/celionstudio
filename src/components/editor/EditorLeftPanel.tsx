"use client";

import { FileText } from "lucide-react";
import type { TiptapBookDocument } from "@/lib/tiptap-document";

type EditorLeftPanelProps = {
  document: TiptapBookDocument;
  visualPageCount?: number;
};

const panelFont = "'Geist', sans-serif";

export function EditorLeftPanel({
  document,
  visualPageCount,
}: EditorLeftPanelProps) {
  const pageCount = Math.max(1, visualPageCount ?? document.pages.length);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <aside
      style={{
        height: "100%",
        background: "#f6f7f8",
        padding: "22px 20px 24px",
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
            color: "#858b93",
            fontFamily: panelFont,
            fontSize: "11px",
            fontWeight: 560,
          }}
        >
          {pageCount}
        </span>
      </div>

      <div style={{ display: "grid", gap: "4px" }}>
        {pages.map((pageNumber, index) => {
          const isActive = index === 0;
          return (
            <button
              key={`page-${pageNumber}`}
              type="button"
              style={{
                width: "100%",
                border: 0,
                borderRadius: "6px",
                background: isActive ? "rgba(255, 255, 255, 0.72)" : "transparent",
                padding: "9px 10px",
                textAlign: "left",
                cursor: "default",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  minHeight: "28px",
                }}
              >
                <span
                  style={{
                    color: isActive ? "#17191d" : "#858b93",
                    fontFamily: panelFont,
                    fontSize: "12px",
                    fontWeight: isActive ? 620 : 520,
                    letterSpacing: "0.02em",
                  }}
                >
                  Page {pageNumber}
                </span>
                <span
                  style={{
                    color: isActive ? "#17191d" : "#b6bbc2",
                    fontFamily: panelFont,
                    fontSize: "11px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(pageNumber).padStart(2, "0")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
