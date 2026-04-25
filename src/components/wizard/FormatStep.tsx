"use client";

import {
  PAGE_FORMATS,
  getPageFormatSpec,
  normalizePageSize,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";

type FormatStepProps = {
  pageFormat: PageFormat;
  customPageSize: PageSize;
  onPageFormatChange: (pageFormat: PageFormat, customPageSize: PageSize) => void;
};

export function FormatStep({
  pageFormat,
  customPageSize,
  onPageFormatChange,
}: FormatStepProps) {
  const selected = getPageFormatSpec(pageFormat, customPageSize);
  const ebookFormats = PAGE_FORMATS.filter((format) => format.group === "ebook");
  const printFormats = PAGE_FORMATS.filter((format) => format.group === "print");
  const customSize = normalizePageSize(customPageSize);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Ebook formats
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {ebookFormats.map((format) => {
            const active = selected.id === format.id;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => onPageFormatChange(format.id, customSize)}
                style={{
                  minHeight: "92px",
                  border: active ? "1px solid #1a1714" : "1px solid #ebe7dd",
                  borderRadius: "7px",
                  background: active ? "#fffdf8" : "#ffffff",
                  boxShadow: active ? "0 0 0 2px rgba(26,23,20,0.05)" : "none",
                  padding: "13px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  <strong style={{ fontSize: "13px", color: "#1a1714" }}>{format.label}</strong>
                  <span style={{ fontSize: "11px", color: "#a59d91" }}>
                    {format.widthMm} x {format.heightMm}
                  </span>
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "7px",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: "#8a867e",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  {format.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          PDF print sizes
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {printFormats.map((format) => {
            const active = selected.id === format.id;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => onPageFormatChange(format.id, customSize)}
                style={{
                  height: "38px",
                  border: active ? "1px solid #1a1714" : "1px solid #ebe7dd",
                  borderRadius: "5px",
                  background: active ? "#1a1714" : "#ffffff",
                  color: active ? "#fffdf8" : "#4a443d",
                  fontSize: "12px",
                  fontWeight: 650,
                  fontFamily: "'Geist', sans-serif",
                  cursor: "pointer",
                }}
              >
                {format.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          border: selected.id === "custom" ? "1px solid #1a1714" : "1px solid #ebe7dd",
          borderRadius: "7px",
          background: "#ffffff",
          padding: "14px",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
            Custom size
          </p>
          <button
            type="button"
            onClick={() => onPageFormatChange("custom", customSize)}
            style={{
              border: "1px solid #e2ded5",
              borderRadius: "4px",
              background: selected.id === "custom" ? "#1a1714" : "#fffdf8",
              color: selected.id === "custom" ? "#fffdf8" : "#1a1714",
              padding: "5px 9px",
              fontSize: "11.5px",
              fontWeight: 650,
              fontFamily: "'Geist', sans-serif",
              cursor: "pointer",
            }}
          >
            Use custom
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-[12px] text-[#8a867e]">
            Width (mm)
            <input
              type="number"
              min={50}
              max={800}
              value={customSize.widthMm}
              onChange={(event) =>
                onPageFormatChange(
                  "custom",
                  normalizePageSize({
                    ...customSize,
                    widthMm: Number(event.target.value),
                  }),
                )
              }
              className="h-9 rounded-[5px] border border-[#ebe7dd] bg-[#fdfcf8] px-3 text-[13px] text-[#1a1714] outline-none focus:border-[#1a1714]"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-[#8a867e]">
            Height (mm)
            <input
              type="number"
              min={50}
              max={800}
              value={customSize.heightMm}
              onChange={(event) =>
                onPageFormatChange(
                  "custom",
                  normalizePageSize({
                    ...customSize,
                    heightMm: Number(event.target.value),
                  }),
                )
              }
              className="h-9 rounded-[5px] border border-[#ebe7dd] bg-[#fdfcf8] px-3 text-[13px] text-[#1a1714] outline-none focus:border-[#1a1714]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
