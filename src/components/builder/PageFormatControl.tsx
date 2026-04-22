"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PAGE_FORMATS,
  getPageFormatSpec,
  normalizePageSize,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";

type PageFormatControlProps = {
  value: PageFormat;
  customPageSize: PageSize;
  onChange: (value: PageFormat, customPageSize: PageSize) => void;
};

function formatSize(size: PageSize) {
  return `${size.widthMm} x ${size.heightMm} mm`;
}

export function PageFormatControl({
  value,
  customPageSize,
  onChange,
}: PageFormatControlProps) {
  const [open, setOpen] = useState(false);
  const [draftCustomSize, setDraftCustomSize] = useState<PageSize>(
    normalizePageSize(customPageSize),
  );
  const selected = getPageFormatSpec(value, customPageSize);
  const ebookFormats = PAGE_FORMATS.filter((format) => format.group === "ebook");
  const printFormats = PAGE_FORMATS.filter((format) => format.group === "print");

  const selectFormat = (nextFormat: PageFormat) => {
    onChange(nextFormat, normalizePageSize(customPageSize));
    setOpen(false);
  };

  const commitCustomSize = () => {
    const nextSize = normalizePageSize(draftCustomSize);
    setDraftCustomSize(nextSize);
    onChange("custom", nextSize);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          height: "30px",
          border: "1px solid #e2ded5",
          borderRadius: "4px",
          background: "#fffdf8",
          color: "#1a1714",
          padding: "0 10px",
          fontFamily: "'Geist', sans-serif",
          fontSize: "12px",
          fontWeight: 550,
          cursor: "pointer",
        }}
      >
        {selected.label}
        <span style={{ color: "#a59d91", fontWeight: 500 }}>
          {selected.id === "custom"
            ? selected.description
            : `${selected.widthMm}x${selected.heightMm}`}
        </span>
        <ChevronDown size={13} strokeWidth={1.8} />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "38px",
            right: 0,
            zIndex: 30,
            width: "292px",
            border: "1px solid #ded8ce",
            borderRadius: "6px",
            background: "rgba(255, 253, 248, 0.98)",
            boxShadow: "0 14px 40px rgba(31, 22, 14, 0.16)",
            padding: "10px",
            fontFamily: "'Geist', sans-serif",
          }}
        >
          <div style={{ padding: "4px 4px 8px" }}>
            <p style={{ margin: 0, color: "#a59d91", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Ebook
            </p>
          </div>
          {ebookFormats.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => selectFormat(format.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                width: "100%",
                gap: "10px",
                border: 0,
                borderRadius: "4px",
                background: value === format.id ? "#f2ede4" : "transparent",
                color: "#1a1714",
                padding: "8px",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "12.5px", fontWeight: 650 }}>{format.label}</span>
              <span style={{ fontSize: "11px", color: "#8a8176" }}>
                {format.widthMm} x {format.heightMm}
              </span>
              <span style={{ gridColumn: "1 / -1", fontSize: "11.5px", color: "#8a8176" }}>
                {format.description}
              </span>
            </button>
          ))}

          <div style={{ margin: "8px 0", height: "1px", background: "#ece6dc" }} />
          <div style={{ padding: "4px 4px 8px" }}>
            <p style={{ margin: 0, color: "#a59d91", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Print
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {printFormats.map((format) => (
              <button
                key={format.id}
                type="button"
                onClick={() => selectFormat(format.id)}
                style={{
                  height: "30px",
                  border: "1px solid #e5ded4",
                  borderRadius: "4px",
                  background: value === format.id ? "#1a1714" : "#fffdf8",
                  color: value === format.id ? "#fffdf8" : "#4a443d",
                  fontSize: "12px",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                {format.label}
              </button>
            ))}
          </div>

          <div style={{ margin: "10px 0", height: "1px", background: "#ece6dc" }} />
          <div style={{ padding: "4px" }}>
            <p style={{ margin: "0 0 8px", color: "#a59d91", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Custom
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#8a8176" }}>
                Width
                <input
                  type="number"
                  min={50}
                  max={800}
                  value={draftCustomSize.widthMm}
                  onChange={(event) =>
                    setDraftCustomSize((current) => ({
                      ...current,
                      widthMm: Number(event.target.value),
                    }))
                  }
                  style={{
                    height: "30px",
                    border: "1px solid #e5ded4",
                    borderRadius: "4px",
                    background: "#fffdf8",
                    padding: "0 8px",
                    fontSize: "12px",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#8a8176" }}>
                Height
                <input
                  type="number"
                  min={50}
                  max={800}
                  value={draftCustomSize.heightMm}
                  onChange={(event) =>
                    setDraftCustomSize((current) => ({
                      ...current,
                      heightMm: Number(event.target.value),
                    }))
                  }
                  style={{
                    height: "30px",
                    border: "1px solid #e5ded4",
                    borderRadius: "4px",
                    background: "#fffdf8",
                    padding: "0 8px",
                    fontSize: "12px",
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={commitCustomSize}
              style={{
                width: "100%",
                height: "30px",
                marginTop: "8px",
                border: "1px solid #1a1714",
                borderRadius: "4px",
                background: value === "custom" ? "#1a1714" : "#fffdf8",
                color: value === "custom" ? "#fffdf8" : "#1a1714",
                fontSize: "12px",
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Use custom {formatSize(normalizePageSize(draftCustomSize))}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
