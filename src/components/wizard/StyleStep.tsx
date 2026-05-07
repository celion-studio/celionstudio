"use client";

import { Check, Palette } from "lucide-react";
import { EBOOK_STYLE_OPTIONS } from "@/lib/ebook-style";
import type { EbookStyle } from "@/types/project";

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

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isHexColor(withHash) ? withHash.toLowerCase() : null;
}

const STYLE_SAMPLE_COPY = {
  eyebrow: "Chapter 01",
  label: "Source guide",
  badge: "Guide",
  headline: "Turn source into pages",
  quote: "Make the source clear.",
  body: "Shape raw material into a focused ebook page with useful hierarchy.",
  note: "Source-backed details create a calmer reading rhythm.",
};

function StylePreview({
  styleId,
  accentColor,
}: {
  styleId: EbookStyle;
  accentColor: string;
}) {
  if (styleId === "minimal") {
    return (
      <div aria-hidden="true" style={{ background: "#fbfbfa", borderRadius: "6px", height: "188px", overflow: "hidden", padding: "20px" }}>
        <div style={{ background: "#ffffff", border: "1px solid #eceff2", display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", padding: "22px 28px" }}>
          <div style={{ color: "#858b93", fontFamily: "'Geist', sans-serif", fontSize: "10px", fontWeight: 500, marginBottom: "10px" }}>{STYLE_SAMPLE_COPY.eyebrow}</div>
          <div>
            <div style={{ color: "#17191d", fontFamily: "'Geist', sans-serif", fontSize: "20px", fontWeight: 500, lineHeight: 1.05, marginBottom: "12px", maxWidth: "190px" }}>
              {STYLE_SAMPLE_COPY.headline}
            </div>
            <div style={{ background: accentColor, height: "4px", marginBottom: "16px", width: "54px" }} />
          </div>
          <div style={{ color: "#69707a", fontFamily: "'Geist', sans-serif", fontSize: "9.5px", lineHeight: 1.45, marginLeft: "42%", maxWidth: "150px" }}>
            {STYLE_SAMPLE_COPY.body}
          </div>
        </div>
      </div>
    );
  }

  if (styleId === "editorial") {
    return (
      <div aria-hidden="true" style={{ background: "#f4f5f6", borderRadius: "6px", height: "188px", overflow: "hidden", padding: "20px" }}>
        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "1.15fr 0.85fr", height: "100%" }}>
          <div>
            <div style={{ color: "#858b93", fontFamily: "'Geist', sans-serif", fontSize: "9.5px", fontWeight: 600, marginBottom: "8px" }}>{STYLE_SAMPLE_COPY.label}</div>
            <div style={{ color: "#17191d", fontFamily: "'Geist', sans-serif", fontSize: "25px", fontWeight: 600, lineHeight: 0.92, marginBottom: "14px" }}>
              {STYLE_SAMPLE_COPY.headline}
            </div>
            <div style={{ background: accentColor, height: "5px", marginBottom: "12px", width: "58px" }} />
            <div style={{ color: "#69707a", fontFamily: "'Geist', sans-serif", fontSize: "9.5px", lineHeight: 1.35 }}>
              {STYLE_SAMPLE_COPY.note}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #d8dce1", paddingLeft: "14px" }}>
            <div style={{ color: "#17191d", fontFamily: "Georgia, serif", fontSize: "26px", lineHeight: 0.95, marginBottom: "12px" }}>
              "{STYLE_SAMPLE_COPY.quote}"
            </div>
            <div style={{ color: "#8b929c", fontFamily: "'Geist', sans-serif", fontSize: "9px", lineHeight: 1.35 }}>
              Pull quote and side notes create a magazine rhythm.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (styleId === "neo-brutalism") {
    return (
      <div aria-hidden="true" style={{ background: "#fffbe6", border: "4px solid #17191d", borderRadius: "6px", height: "188px", overflow: "hidden", padding: "18px" }}>
        <div style={{ border: "2px solid #17191d", marginBottom: "12px", padding: "9px" }}>
          <div style={{ color: "#17191d", fontFamily: "'Geist', sans-serif", fontSize: "9px", fontWeight: 800, marginBottom: "5px" }}>{STYLE_SAMPLE_COPY.eyebrow}</div>
          <div style={{ color: "#17191d", fontFamily: "'Geist', sans-serif", fontSize: "20px", fontWeight: 800, lineHeight: 0.95 }}>
            {STYLE_SAMPLE_COPY.headline}
          </div>
        </div>
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 56px" }}>
          <div style={{ background: "#17191d", color: "#ffffff", fontFamily: "'Geist', sans-serif", fontSize: "9.5px", fontWeight: 600, lineHeight: 1.25, padding: "10px" }}>
            Extract the argument. Keep the useful details.
          </div>
          <div style={{ alignItems: "center", background: accentColor, border: "2px solid #17191d", color: "#17191d", display: "flex", fontFamily: "'Geist', sans-serif", fontSize: "18px", fontWeight: 800, justifyContent: "center" }}>01</div>
        </div>
      </div>
    );
  }

  if (styleId === "bold") {
    return (
      <div aria-hidden="true" style={{ background: "#101723", borderRadius: "6px", height: "188px", overflow: "hidden", padding: "22px" }}>
        <div style={{ background: accentColor, color: "#ffffff", display: "inline-block", fontFamily: "'Geist', sans-serif", fontSize: "9px", fontWeight: 700, marginBottom: "14px", padding: "5px 7px" }}>{STYLE_SAMPLE_COPY.badge}</div>
        <div style={{ color: "#ffffff", fontFamily: "'Geist', sans-serif", fontSize: "31px", fontWeight: 700, lineHeight: 0.9, marginBottom: "14px", maxWidth: "230px" }}>
          {STYLE_SAMPLE_COPY.headline}
        </div>
        <div style={{ color: "rgba(255,255,255,0.62)", fontFamily: "'Geist', sans-serif", fontSize: "10px", lineHeight: 1.35, maxWidth: "245px" }}>
          Big type, decisive contrast, and clear sections for fast scanning.
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" style={{ background: "#faf8f4", borderRadius: "6px", height: "188px", overflow: "hidden", padding: "24px" }}>
      <div style={{ borderTop: "1px solid #cfc8bc", borderBottom: "1px solid #cfc8bc", height: "100%", padding: "22px 28px" }}>
        <div style={{ color: "#9a8f7d", fontFamily: "'Geist', sans-serif", fontSize: "9px", letterSpacing: "0.08em", marginBottom: "10px" }}>{STYLE_SAMPLE_COPY.eyebrow}</div>
        <div style={{ color: "#17191d", fontFamily: "Georgia, serif", fontSize: "25px", lineHeight: 1.04, marginBottom: "14px" }}>
          {STYLE_SAMPLE_COPY.headline}
        </div>
        <div style={{ background: accentColor, height: "3px", marginBottom: "13px", width: "44px" }} />
        <div style={{ color: "#7f7569", fontFamily: "Georgia, serif", fontSize: "10px", lineHeight: 1.4 }}>
          Refined spacing gives the source a polished book feel.
        </div>
      </div>
    </div>
  );
}

export function StyleStep({ ebookStyle, onStyleChange, accentColor, onAccentColorChange }: Props) {
  const safeAccentColor = isHexColor(accentColor) ? accentColor : "#6366f1";
  const selectedAccent = ACCENT_COLORS.find((color) => color.value === accentColor);

  function commitAccentColor(value: string) {
    const normalized = normalizeHexColor(value);
    if (normalized) onAccentColorChange(normalized);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {EBOOK_STYLE_OPTIONS.map((style) => {
          const isSelected = ebookStyle === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              style={{
                background: "#ffffff",
                border: isSelected ? "1px solid #17191d" : "1px solid #dde2e7",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                minHeight: "304px",
                padding: "8px",
                position: "relative",
                boxShadow: "none",
                textAlign: "left",
                width: "100%",
              }}
            >
              <StylePreview styleId={style.id} accentColor={safeAccentColor} />

              <div style={{ display: "grid", flex: 1, gridTemplateColumns: "1fr auto", gap: "16px", padding: "18px 16px 14px" }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "#17191d",
                      fontFamily: "'Geist', sans-serif",
                      fontSize: "25px",
                      fontWeight: 500,
                      lineHeight: 1.04,
                      marginBottom: "10px",
                    }}
                  >
                    {style.label}
                  </div>
                  <div
                    style={{
                      color: "#69707a",
                      fontFamily: "'Geist', sans-serif",
                      fontSize: "13px",
                      fontWeight: 400,
                      lineHeight: 1.38,
                      maxWidth: "300px",
                    }}
                  >
                    {style.desc}
                  </div>
                </div>
                <div
                  style={{
                    alignItems: "center",
                    background: isSelected ? "#17191d" : "#ffffff",
                    border: isSelected ? "1px solid #17191d" : "1px solid #dbe0e6",
                    borderRadius: "6px",
                    display: "flex",
                    height: "22px",
                    justifyContent: "center",
                    marginTop: "2px",
                    width: "22px",
                  }}
                >
                  {isSelected ? <Check size={13} color="#ffffff" strokeWidth={2.2} /> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          border: "1px solid #dde2e7",
          borderRadius: "6px",
          background: "#fbfbfa",
          padding: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Palette size={15} style={{ color: "#69707a" }} />
          <p style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#17191d" }}>
            Accent color
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[190px_1fr]">
          <label
            style={{
              display: "block",
              position: "relative",
              minHeight: "128px",
              overflow: "hidden",
              border: "1px solid #d9dde2",
              borderRadius: "6px",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0)), linear-gradient(0deg, #17191d, rgba(23,25,29,0)), linear-gradient(135deg, #ffffff, " + safeAccentColor + ")",
              cursor: "pointer",
            }}
            aria-label="Open color picker"
          >
            <input
              type="color"
              value={safeAccentColor}
              onChange={(event) => {
                onAccentColorChange(event.target.value);
              }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
                border: "0",
                background: "transparent",
                cursor: "pointer",
                opacity: 0,
                padding: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "12px",
                bottom: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid rgba(255,255,255,0.72)",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.82)",
                padding: "6px 8px",
                color: "#17191d",
                fontFamily: "'Geist', sans-serif",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "6px",
                  background: safeAccentColor,
                  border: "1px solid rgba(0,0,0,0.12)",
                }}
              />
              Pick any color
            </div>
          </label>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: "8px", alignItems: "end" }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", marginBottom: "7px", fontFamily: "'Geist', sans-serif", fontSize: "12.5px", fontWeight: 500, color: "#4b515a" }}>
                  Hex value
                </span>
                <input
                  key={accentColor}
                  defaultValue={accentColor}
                  onBlur={(event) => commitAccentColor(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitAccentColor(event.currentTarget.value);
                    }
                  }}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    minHeight: "40px",
                    border: "1px solid #d9dde2",
                    borderRadius: "6px",
                    background: "#ffffff",
                    color: "#17191d",
                    fontFamily: "'Geist', sans-serif",
                    fontSize: "13px",
                    padding: "0 10px",
                    outline: "none",
                  }}
                />
              </label>
              <div
                style={{
                  width: "44px",
                  height: "40px",
                  borderRadius: "6px",
                  background: safeAccentColor,
                  border: "1px solid rgba(0,0,0,0.12)",
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    onAccentColorChange(color.value);
                  }}
                  title={color.label}
                  aria-label={`Choose ${color.label} accent color`}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: color.value,
                    border: accentColor === color.value ? "2px solid #17191d" : "1px solid #d9dde2",
                    boxShadow: "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <p style={{ margin: "10px 0 0", fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#858b93" }}>
              Selected: {selectedAccent?.label ?? "Custom"} ({accentColor})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
