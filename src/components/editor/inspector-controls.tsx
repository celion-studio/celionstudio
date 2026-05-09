"use client";

import type { ChangeEvent, ReactNode } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import type { CelionEditableElement } from "@/lib/ebook-document";
import { CelionSegmentedControl } from "@/components/ui/celion-controls";
import type { InspectorStyleValues } from "./editor-types";

type Props = {
  element: CelionEditableElement | null;
  textValue: string;
  styleValues: InspectorStyleValues;
  onTextChange: (value: string) => void;
  onApplyText: () => void;
  onStyleChange: (prop: string, value: string) => void;
};

const alignOptions = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
] as const;

function clampValue(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (typeof min === "number") nextValue = Math.max(min, nextValue);
  if (typeof max === "number") nextValue = Math.min(max, nextValue);
  return nextValue;
}

function numberFromStyleValue(value: string | undefined, options?: { unitlessOnly?: boolean }) {
  if (!value || value === "normal") return "";
  if (options?.unitlessOnly && /[a-z%]/i.test(value)) return "";
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match?.[0] ?? "";
}

function colorFromStyleValue(value: string | undefined, fallback: string) {
  if (!value || value === "transparent") return fallback;
  if (value.startsWith("#")) return value.slice(0, 7);

  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return fallback;

  const [, r, g, b] = match;
  return [r, g, b]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .replace(/^/, "#");
}

function alignFromStyleValue(value: string | undefined) {
  const normalized = value?.toLowerCase();
  if (!normalized) return "";
  if (normalized === "start") return "left";
  if (normalized === "end") return "right";
  return alignOptions.some((option) => option.value === normalized) ? normalized : "";
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="inspector-section">
      <p className="inspector-section-title">{title}</p>
      <div className="inspector-section-body">
        {children}
      </div>
    </div>
  );
}

function ControlRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="inspector-control-row">
      <span className="inspector-control-label">{label}</span>
      {children}
    </div>
  );
}

function NumberControl({
  label,
  min,
  max,
  step,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder: string;
  value?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <ControlRow label={label}>
      <input
        key={value ?? ""}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        defaultValue={value ?? ""}
        onChange={onChange}
        className="inspector-input"
      />
    </ControlRow>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ControlRow label={label}>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="inspector-input inspector-color-input"
      />
    </ControlRow>
  );
}

function AlignControl({
  value: selectedValue,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ControlRow label="Align">
      <CelionSegmentedControl
        ariaLabel="Text alignment"
        onChange={onChange}
        options={alignOptions.map(({ value, label, Icon }) => ({
          value,
          ariaLabel: label,
          label: <Icon size={14} strokeWidth={1.8} />,
          title: label,
        }))}
        value={selectedValue}
      />
    </ControlRow>
  );
}

export function InspectorControls({
  element,
  textValue,
  styleValues,
  onTextChange,
  onApplyText,
  onStyleChange,
}: Props) {
  if (!element) {
    return (
      <p className="inspector-empty">
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
    <div className="inspector-controls">
      <p className="inspector-element-label">
        {element.label}
      </p>

      {editableProps.has("text") && (
        <InspectorSection title="Content">
          <textarea
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            rows={6}
            className="inspector-input inspector-textarea"
          />
          <button
            onClick={onApplyText}
            disabled={!textValue.trim()}
            className="inspector-apply-button"
          >
            Apply text
          </button>
        </InspectorSection>
      )}

      {(editableProps.has("fontSize") || editableProps.has("fontWeight") || editableProps.has("lineHeight") || editableProps.has("letterSpacing") || editableProps.has("textAlign") || editableProps.has("color")) && (
        <InspectorSection title="Typography">
          {editableProps.has("fontSize") && (
            <NumberControl
              label="Size"
              min="1"
              placeholder="16"
              value={numberFromStyleValue(styleValues.fontSize)}
              onChange={(event) => applyNumberStyle(event, "fontSize", (value) => `${value}px`, 1)}
            />
          )}

          {editableProps.has("fontWeight") && (
            <NumberControl
              label="Weight"
              min="100"
              max="900"
              step="100"
              placeholder="400"
              value={numberFromStyleValue(styleValues.fontWeight)}
              onChange={(event) => applyNumberStyle(event, "fontWeight", String, 100, 900)}
            />
          )}

          {editableProps.has("lineHeight") && (
            <NumberControl
              label="Line"
              min="0.8"
              max="3"
              step="0.05"
              placeholder="1.6"
              value={numberFromStyleValue(styleValues.lineHeight, { unitlessOnly: true })}
              onChange={(event) => applyNumberStyle(event, "lineHeight", String, 0.8, 3)}
            />
          )}

          {editableProps.has("letterSpacing") && (
            <NumberControl
              label="Tracking"
              min="-2"
              max="12"
              step="0.1"
              placeholder="0"
              value={numberFromStyleValue(styleValues.letterSpacing)}
              onChange={(event) => applyNumberStyle(event, "letterSpacing", (value) => `${value}px`, -2, 12)}
            />
          )}

          {editableProps.has("textAlign") && (
            <AlignControl
              value={alignFromStyleValue(styleValues.textAlign)}
              onChange={(value) => onStyleChange("textAlign", value)}
            />
          )}

          {editableProps.has("color") && (
            <ColorControl
              label="Color"
              value={colorFromStyleValue(styleValues.color, "#18181b")}
              onChange={(value) => onStyleChange("color", value)}
            />
          )}
        </InspectorSection>
      )}

      {(editableProps.has("backgroundColor") || editableProps.has("opacity") || editableProps.has("borderColor") || editableProps.has("borderWidth") || editableProps.has("borderRadius")) && (
        <InspectorSection title="Appearance">
          {editableProps.has("backgroundColor") && (
            <ColorControl
              label="Fill"
              value={colorFromStyleValue(styleValues.backgroundColor, "#ffffff")}
              onChange={(value) => onStyleChange("backgroundColor", value)}
            />
          )}

          {editableProps.has("opacity") && (
            <NumberControl
              label="Opacity"
              min="0"
              max="1"
              step="0.1"
              placeholder="1"
              value={numberFromStyleValue(styleValues.opacity)}
              onChange={(event) => applyNumberStyle(event, "opacity", String, 0, 1)}
            />
          )}

          {editableProps.has("borderColor") && (
            <ColorControl
              label="Stroke"
              value={colorFromStyleValue(styleValues.borderColor, "#d4d4d8")}
              onChange={(value) => onStyleChange("borderColor", value)}
            />
          )}

          {editableProps.has("borderWidth") && (
            <NumberControl
              label="Stroke W"
              min="0"
              max="24"
              placeholder="1"
              value={numberFromStyleValue(styleValues.borderWidth)}
              onChange={(event) => applyNumberStyle(event, "borderWidth", (value) => `${value}px`, 0, 24)}
            />
          )}

          {editableProps.has("borderRadius") && (
            <NumberControl
              label="Radius"
              min="0"
              max="120"
              placeholder="8"
              value={numberFromStyleValue(styleValues.borderRadius)}
              onChange={(event) => applyNumberStyle(event, "borderRadius", (value) => `${value}px`, 0, 120)}
            />
          )}
        </InspectorSection>
      )}

      {(editableProps.has("margin") || editableProps.has("padding")) && (
        <InspectorSection title="Spacing">
          {editableProps.has("margin") && (
            <NumberControl
              label="Margin"
              min="0"
              max="160"
              placeholder="0"
              value={numberFromStyleValue(styleValues.margin)}
              onChange={(event) => applyNumberStyle(event, "margin", (value) => `${value}px`, 0, 160)}
            />
          )}

          {editableProps.has("padding") && (
            <NumberControl
              label="Padding"
              min="0"
              max="160"
              placeholder="16"
              value={numberFromStyleValue(styleValues.padding)}
              onChange={(event) => applyNumberStyle(event, "padding", (value) => `${value}px`, 0, 160)}
            />
          )}
        </InspectorSection>
      )}
    </div>
  );
}
