"use client";

const PAGE_COUNT_OPTIONS = [8, 12, 16, 20, 24, 32, 40];

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
  pageCount: number;
  accentColor: string;
  onPageCountChange: (count: number) => void;
  onAccentColorChange: (color: string) => void;
};

export function FormatStepEbook({ pageCount, accentColor, onPageCountChange, onAccentColorChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label style={{ display: "block", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1a1714", marginBottom: "10px" }}>
          Page count
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PAGE_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onPageCountChange(count)}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                border: pageCount === count ? "2px solid #1a1714" : "1.5px solid #e1e4e8",
                background: pageCount === count ? "#1a1714" : "#ffffff",
                color: pageCount === count ? "#ffffff" : "#4b515a",
                fontFamily: "'Geist', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {count}p
            </button>
          ))}
        </div>
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
          Selected: {ACCENT_COLORS.find(c => c.value === accentColor)?.label ?? "Custom"} ({accentColor})
        </p>
      </div>
    </div>
  );
}
