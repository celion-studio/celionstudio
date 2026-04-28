"use client";

import type { EbookStyle } from "@/types/project";

const STYLES: { id: EbookStyle; label: string; desc: string; preview: string }[] = [
  {
    id: "minimal",
    label: "Minimal",
    desc: "Clean white space, generous margins, single accent",
    preview: "bg-white border-2 border-gray-100",
  },
  {
    id: "editorial",
    label: "Editorial",
    desc: "Magazine-style, strong type hierarchy, bold headers",
    preview: "bg-gray-50 border-2 border-gray-200",
  },
  {
    id: "neo-brutalism",
    label: "Neo Brutalism",
    desc: "Thick borders, high contrast, stark typography",
    preview: "bg-yellow-50 border-4 border-black",
  },
  {
    id: "bold",
    label: "Bold",
    desc: "Large impactful type, vibrant color blocks",
    preview: "bg-gray-900 border-2 border-gray-700",
  },
  {
    id: "elegant",
    label: "Elegant",
    desc: "Serif fonts, refined spacing, classic book feel",
    preview: "bg-stone-50 border-2 border-stone-200",
  },
];

type Props = {
  ebookStyle: EbookStyle | null;
  onStyleChange: (style: EbookStyle) => void;
};

export function StyleStep({ ebookStyle, onStyleChange }: Props) {
  return (
    <div className="space-y-3">
      {STYLES.map((style) => {
        const isSelected = ebookStyle === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onStyleChange(style.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px 18px",
              borderRadius: "8px",
              border: isSelected ? "2px solid #1a1714" : "1.5px solid #e1e4e8",
              background: isSelected ? "#f7f6f4" : "#ffffff",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "64px",
                borderRadius: "4px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#888",
                overflow: "hidden",
              }}
              className={style.preview}
            >
              <div style={{ padding: "4px", width: "100%" }}>
                <div style={{ height: "4px", background: "currentColor", opacity: 0.3, borderRadius: "2px", marginBottom: "3px" }} />
                <div style={{ height: "2px", background: "currentColor", opacity: 0.2, borderRadius: "2px", marginBottom: "2px" }} />
                <div style={{ height: "2px", background: "currentColor", opacity: 0.2, borderRadius: "2px", width: "70%", marginBottom: "6px" }} />
                <div style={{ height: "1px", background: "currentColor", opacity: 0.15, borderRadius: "1px", marginBottom: "1px" }} />
                <div style={{ height: "1px", background: "currentColor", opacity: 0.15, borderRadius: "1px", marginBottom: "1px" }} />
                <div style={{ height: "1px", background: "currentColor", opacity: 0.15, borderRadius: "1px", width: "80%" }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1a1714", marginBottom: "3px" }}>
                {style.label}
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#8a867e" }}>
                {style.desc}
              </div>
            </div>
            {isSelected && (
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#1a1714", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
