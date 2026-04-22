"use client";

import type { PartialBlock } from "@blocknote/core";
import { FileText } from "lucide-react";

type BuilderLeftPanelProps = {
  blocks: PartialBlock[];
};

function textFromContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null && "text" in item) {
        const text = (item as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("")
    .trim();
}

export function BuilderLeftPanel({ blocks }: BuilderLeftPanelProps) {
  const headings = blocks
    .filter((block) => block.type === "heading")
    .map((block) => textFromContent(block.content))
    .filter(Boolean)
    .slice(0, 12);

  return (
    <aside
      style={{
        height: "100%",
        borderRight: "1px solid #e8e4dd",
        background: "#f7f4ee",
        padding: "22px 18px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "18px",
          color: "#a19a90",
          fontFamily: "'Geist', sans-serif",
          fontSize: "10px",
          fontWeight: 650,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <FileText size={12} strokeWidth={1.8} />
        Outline
      </div>

      {headings.length > 0 ? (
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {headings.map((heading, index) => (
            <button
              key={`${heading}-${index}`}
              type="button"
              style={{
                width: "100%",
                border: 0,
                background: "transparent",
                padding: "7px 0",
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
              {heading}
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
