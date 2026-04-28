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
                  border: active ? "1px solid #17191d" : "1px solid #e1e4e8",
                  borderRadius: "7px",
                  background: active ? "#f7f8fa" : "#ffffff",
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
                  <span style={{ fontSize: "11px", color: "#8f969f" }}>
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
              border: active ? "1px solid #17191d" : "1px solid #e1e4e8",
                  borderRadius: "5px",
              background: active ? "#17191d" : "#ffffff",
              color: active ? "#ffffff" : "#4b515a",
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
          border: selected.id === "custom" ? "1px solid #17191d" : "1px solid #e1e4e8",
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
              border: "1px solid #e1e4e8",
              borderRadius: "4px",
              background: selected.id === "custom" ? "#17191d" : "#ffffff",
              color: selected.id === "custom" ? "#ffffff" : "#17191d",
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
          <label className="grid gap-1 text-[12px] text-[#858b93]">
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
              className="h-9 rounded-[5px] border border-[#e1e4e8] bg-[#ffffff] px-3 text-[13px] text-[#17191d] outline-none focus:border-[#17191d]"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-[#858b93]">
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
              className="h-9 rounded-[5px] border border-[#e1e4e8] bg-[#ffffff] px-3 text-[13px] text-[#17191d] outline-none focus:border-[#17191d]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
