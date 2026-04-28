"use client";

import { Check } from "lucide-react";
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

const ACCENT_COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Slate", value: "#475569" },
  { label: "Black", value: "#1a1714" },
];

type Props = {
  ebookStyle: EbookStyle | null;
  onStyleChange: (style: EbookStyle) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
};

export function StyleStep({ ebookStyle, onStyleChange, accentColor, onAccentColorChange }: Props) {
  const selectedAccent = ACCENT_COLORS.find((color) => color.value === accentColor);

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        {STYLES.map((style) => {
          const isSelected = ebookStyle === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                width: "100%",
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
                  <div style={{ height: "4px", background: accentColor, borderRadius: "2px", marginBottom: "3px" }} />
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
                  <Check size={11} color="#ffffff" strokeWidth={2} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <label style={{ display: "block", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1a1714", marginBottom: "10px" }}>
          Accent color
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onAccentColorChange(color.value)}
              title={color.label}
              aria-label={`Choose ${color.label} accent color`}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: color.value,
                border: accentColor === color.value ? "3px solid #1a1714" : "2px solid transparent",
                outline: accentColor === color.value ? "2px solid #ffffff" : "none",
                outlineOffset: "-3px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            />
          ))}
        </div>
        <p style={{ marginTop: "8px", fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#8a867e" }}>
          Selected: {selectedAccent?.label ?? "Custom"} ({accentColor})
        </p>
      </div>
    </div>
  );
}
