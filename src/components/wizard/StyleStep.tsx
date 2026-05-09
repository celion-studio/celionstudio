"use client";

import type { CSSProperties } from "react";
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
  const accentStyle = {
    "--wizard-accent-color": accentColor,
  } as CSSProperties;

  if (styleId === "minimal") {
    return (
      <div aria-hidden="true" className="wizard-style-preview wizard-style-preview-minimal" style={accentStyle}>
        <div className="wizard-style-minimal-card">
          <div className="wizard-style-eyebrow">{STYLE_SAMPLE_COPY.eyebrow}</div>
          <div>
            <div className="wizard-style-title">
              {STYLE_SAMPLE_COPY.headline}
            </div>
            <div className="wizard-style-accent-rule" />
          </div>
          <div className="wizard-style-body">
            {STYLE_SAMPLE_COPY.body}
          </div>
        </div>
      </div>
    );
  }

  if (styleId === "editorial") {
    return (
      <div aria-hidden="true" className="wizard-style-preview wizard-style-preview-editorial" style={accentStyle}>
        <div className="wizard-style-editorial-grid">
          <div>
            <div className="wizard-style-label">{STYLE_SAMPLE_COPY.label}</div>
            <div className="wizard-style-title-large">
              {STYLE_SAMPLE_COPY.headline}
            </div>
            <div className="wizard-style-accent-rule wizard-style-accent-rule-wide" />
            <div className="wizard-style-note">
              {STYLE_SAMPLE_COPY.note}
            </div>
          </div>
          <div className="wizard-style-editorial-side">
            <div className="wizard-style-quote">
              "{STYLE_SAMPLE_COPY.quote}"
            </div>
            <div className="wizard-style-muted">
              Pull quote and side notes create a magazine rhythm.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (styleId === "neo-brutalism") {
    return (
      <div aria-hidden="true" className="wizard-style-preview wizard-style-preview-brutal" style={accentStyle}>
        <div className="wizard-style-brutal-box">
          <div className="wizard-style-brutal-eyebrow">{STYLE_SAMPLE_COPY.eyebrow}</div>
          <div className="wizard-style-title-brutal">
            {STYLE_SAMPLE_COPY.headline}
          </div>
        </div>
        <div className="wizard-style-brutal-grid">
          <div className="wizard-style-brutal-copy">
            Extract the argument. Keep the useful details.
          </div>
          <div className="wizard-style-brutal-number">01</div>
        </div>
      </div>
    );
  }

  if (styleId === "bold") {
    return (
      <div aria-hidden="true" className="wizard-style-preview wizard-style-preview-bold" style={accentStyle}>
        <div className="wizard-style-badge">{STYLE_SAMPLE_COPY.badge}</div>
        <div className="wizard-style-title-bold">
          {STYLE_SAMPLE_COPY.headline}
        </div>
        <div className="wizard-style-muted wizard-style-muted-on-dark">
          Big type, decisive contrast, and clear sections for fast scanning.
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="wizard-style-preview wizard-style-preview-classic" style={accentStyle}>
      <div className="wizard-style-classic-frame">
        <div className="wizard-style-classic-eyebrow">{STYLE_SAMPLE_COPY.eyebrow}</div>
        <div className="wizard-style-title-serif">
          {STYLE_SAMPLE_COPY.headline}
        </div>
        <div className="wizard-style-accent-rule wizard-style-accent-rule-classic" />
        <div className="wizard-style-classic-body">
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
      <div className="wizard-style-grid">
        {EBOOK_STYLE_OPTIONS.map((style) => {
          const isSelected = ebookStyle === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className="wizard-style-card"
              data-active={isSelected}
            >
              <StylePreview styleId={style.id} accentColor={safeAccentColor} />

              <div className="wizard-style-card-body">
                <div className="wizard-style-card-copy">
                  <div className="wizard-style-card-title">
                    {style.label}
                  </div>
                  <div className="wizard-style-card-desc">
                    {style.desc}
                  </div>
                </div>
                <div className="wizard-style-check">
                  {isSelected ? <Check size={13} color="currentColor" strokeWidth={2.2} /> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="wizard-accent-panel"
        style={{ "--wizard-accent-color": safeAccentColor } as CSSProperties}
      >
        <div className="wizard-section-head">
          <Palette size={15} className="wizard-section-icon" />
          <p className="wizard-section-title">
            Accent color
          </p>
        </div>

        <div className="wizard-accent-grid">
          <label
            className="wizard-color-picker"
            aria-label="Open color picker"
          >
            <input
              type="color"
              value={safeAccentColor}
              onChange={(event) => {
                onAccentColorChange(event.target.value);
              }}
              className="wizard-color-input-native"
            />
            <div className="wizard-color-picker-label">
              <span className="wizard-color-chip" />
              Pick any color
            </div>
          </label>

          <div className="wizard-accent-controls">
            <div className="wizard-accent-input-row">
              <label>
                <span className="wizard-field-label">
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
                  className="wizard-text-input"
                />
              </label>
              <div className="wizard-accent-preview" />
            </div>

            <div className="wizard-color-swatches">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    onAccentColorChange(color.value);
                  }}
                  title={color.label}
                  aria-label={`Choose ${color.label} accent color`}
                  className="wizard-color-swatch"
                  data-active={accentColor === color.value}
                  style={{ "--wizard-swatch-color": color.value } as CSSProperties}
                />
              ))}
            </div>
            <p className="wizard-selection-note">
              Selected: {selectedAccent?.label ?? "Custom"} ({accentColor})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
