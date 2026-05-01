"use client";

import type { ChangeEvent } from "react";
import type { CelionEditableElement } from "@/lib/ebook-document";

type Props = {
  element: CelionEditableElement | null;
  textValue: string;
  onTextChange: (value: string) => void;
  onApplyText: () => void;
  onStyleChange: (prop: string, value: string) => void;
};

const labelStyle = {
  fontSize: "11.5px",
  color: "#71717a",
} as const;

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1.5px solid #e4e4e7",
  fontSize: "13px",
  fontFamily: "'Geist', sans-serif",
  outline: "none",
  boxSizing: "border-box",
} as const;

const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  paddingTop: "12px",
  borderTop: "1px solid #f0eee9",
} as const;

function clampValue(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (typeof min === "number") nextValue = Math.max(min, nextValue);
  if (typeof max === "number") nextValue = Math.min(max, nextValue);
  return nextValue;
}

export function InspectorControls({
  element,
  textValue,
  onTextChange,
  onApplyText,
  onStyleChange,
}: Props) {
  if (!element) {
    return (
      <p style={{ fontSize: "12.5px", color: "#a1a1aa", lineHeight: 1.6 }}>
        Click an editable element in the preview.
      </p>
    );
  }

  const editableProps = new Set(element.editableProps);
  const applyNumberStyle = (
    event: ChangeEvent<HTMLInputElement>,
    prop: string,
    formatValue: (value: number) => string,
    min?: number,
    max?: number,
  ) => {
    if (event.currentTarget.value === "") return;

    const value = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(value)) return;

    onStyleChange(prop, formatValue(clampValue(value, min, max)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "13px", fontWeight: 600, color: "#18181b", margin: 0 }}>
        {element.label}
      </p>

      {editableProps.has("text") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={labelStyle}>Text</label>
          <textarea
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
            onFocus={(event) => { event.target.style.borderColor = "#6366f1"; }}
            onBlur={(event) => { event.target.style.borderColor = "#e4e4e7"; }}
          />
          <button
            onClick={onApplyText}
            disabled={!textValue.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              background: "#18181b",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: textValue.trim() ? 1 : 0.4,
            }}
          >
            Apply text
          </button>
        </div>
      )}

      {editableProps.has("fontSize") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Font size</label>
          <input
            type="number"
            min="1"
            placeholder="16"
            onChange={(event) => applyNumberStyle(event, "fontSize", (value) => `${value}px`, 1)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("fontWeight") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Font weight</label>
          <input
            type="number"
            min="100"
            max="900"
            step="100"
            placeholder="400"
            onChange={(event) => applyNumberStyle(event, "fontWeight", String, 100, 900)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("lineHeight") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Line height</label>
          <input
            type="number"
            min="0.8"
            max="3"
            step="0.05"
            placeholder="1.6"
            onChange={(event) => applyNumberStyle(event, "lineHeight", String, 0.8, 3)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("letterSpacing") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Letter spacing</label>
          <input
            type="number"
            min="-2"
            max="12"
            step="0.1"
            placeholder="0"
            onChange={(event) => applyNumberStyle(event, "letterSpacing", (value) => `${value}px`, -2, 12)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("textAlign") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Text align</label>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onStyleChange("textAlign", event.target.value);
            }}
            style={inputStyle}
          >
            <option value="" disabled>Choose alignment</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </select>
        </div>
      )}

      {editableProps.has("color") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Color</label>
          <input
            type="color"
            defaultValue="#18181b"
            onChange={(event) => onStyleChange("color", event.target.value)}
            style={{ ...inputStyle, height: "38px", padding: "4px 6px" }}
          />
        </div>
      )}

      {editableProps.has("backgroundColor") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Background</label>
          <input
            type="color"
            defaultValue="#ffffff"
            onChange={(event) => onStyleChange("backgroundColor", event.target.value)}
            style={{ ...inputStyle, height: "38px", padding: "4px 6px" }}
          />
        </div>
      )}

      {editableProps.has("opacity") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Opacity</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            defaultValue="1"
            onChange={(event) => applyNumberStyle(event, "opacity", String, 0, 1)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("borderColor") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Border color</label>
          <input
            type="color"
            defaultValue="#d4d4d8"
            onChange={(event) => onStyleChange("borderColor", event.target.value)}
            style={{ ...inputStyle, height: "38px", padding: "4px 6px" }}
          />
        </div>
      )}

      {editableProps.has("borderWidth") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Border width</label>
          <input
            type="number"
            min="0"
            max="24"
            placeholder="1"
            onChange={(event) => applyNumberStyle(event, "borderWidth", (value) => `${value}px`, 0, 24)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("borderRadius") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Border radius</label>
          <input
            type="number"
            min="0"
            max="120"
            placeholder="8"
            onChange={(event) => applyNumberStyle(event, "borderRadius", (value) => `${value}px`, 0, 120)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("margin") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Margin</label>
          <input
            type="number"
            min="0"
            max="160"
            placeholder="0"
            onChange={(event) => applyNumberStyle(event, "margin", (value) => `${value}px`, 0, 160)}
            style={inputStyle}
          />
        </div>
      )}

      {editableProps.has("padding") && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Padding</label>
          <input
            type="number"
            min="0"
            max="160"
            placeholder="16"
            onChange={(event) => applyNumberStyle(event, "padding", (value) => `${value}px`, 0, 160)}
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}
