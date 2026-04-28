"use client";

import { AlignCenter, AlignLeft, AlignRight, BookOpen, Hash, Minus, Type } from "lucide-react";
import type { TiptapBookLayout } from "@/lib/tiptap-document";

type ActionPanelProps = {
  layout: TiptapBookLayout;
  onLayoutChange?: (layout: TiptapBookLayout) => void;
};

const panelFont = "'Geist', sans-serif";

const alignOptions: {
  value: NonNullable<TiptapBookLayout["headerAlign"]>;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "left", label: "Left", icon: <AlignLeft size={14} strokeWidth={1.8} /> },
  { value: "center", label: "Center", icon: <AlignCenter size={14} strokeWidth={1.8} /> },
  { value: "right", label: "Right", icon: <AlignRight size={14} strokeWidth={1.8} /> },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: panelFont,
        fontSize: "10px",
        fontWeight: 650,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#8f969f",
      }}
    >
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 7px",
        fontFamily: panelFont,
        fontSize: "11px",
        fontWeight: 560,
        color: "#5f6670",
      }}
    >
      {children}
    </p>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: "34px",
  padding: "0 30px 0 10px",
  border: "1px solid #e1e4e8",
  borderRadius: "6px",
  background: "#ffffff",
  color: "#17191d",
  fontFamily: panelFont,
  fontSize: "12.5px",
  outline: "none",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666d78' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "34px",
  padding: "0 10px",
  border: "1px solid #e1e4e8",
  borderRadius: "6px",
  background: "#ffffff",
  color: "#17191d",
  fontFamily: panelFont,
  fontSize: "12.5px",
  outline: "none",
  boxSizing: "border-box",
};

function AlignControl({
  value,
  disabled,
  onChange,
}: {
  value: NonNullable<TiptapBookLayout["headerAlign"]>;
  disabled?: boolean;
  onChange(value: NonNullable<TiptapBookLayout["headerAlign"]>): void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1px",
        height: "34px",
        overflow: "hidden",
        border: "1px solid #e1e4e8",
        borderRadius: "6px",
        background: "#e1e4e8",
        opacity: disabled ? 0.44 : 1,
      }}
    >
      {alignOptions.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: 0,
              background: active ? "#17191d" : "#ffffff",
              color: active ? "#ffffff" : "#5f6670",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function ChromeSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "18px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ display: "flex", color: "#17130f" }}>{icon}</span>
        <SectionLabel>{title}</SectionLabel>
      </div>
      {children}
    </section>
  );
}

export function ActionPanel({ layout, onLayoutChange }: ActionPanelProps) {
  const canEdit = Boolean(onLayoutChange);
  const updateLayout = (nextLayout: TiptapBookLayout) => onLayoutChange?.(nextLayout);

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#f8f9fa",
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "22px 20px 18px" }}>
        <div style={{ marginBottom: "4px" }}>
          <SectionLabel>Inspector</SectionLabel>
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: panelFont,
            fontSize: "20px",
            fontWeight: 500,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "#17130f",
          }}
        >
          Page chrome
        </h2>
        <p
          style={{
            margin: "9px 0 0",
            maxWidth: "220px",
            fontFamily: panelFont,
            fontSize: "12.5px",
            lineHeight: 1.55,
            color: "#666d78",
          }}
        >
          Set the quiet furniture around the manuscript.
        </p>

        <ChromeSection title="Header" icon={<BookOpen size={15} strokeWidth={1.8} />}>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <FieldLabel>Source</FieldLabel>
              <select
                value={layout.headerType ?? "none"}
                disabled={!canEdit}
                onChange={(event) =>
                  updateLayout({
                    ...layout,
                    headerType: event.target.value as TiptapBookLayout["headerType"],
                  })
                }
                style={selectStyle}
              >
                <option value="none">None</option>
                <option value="chapter">Chapter title</option>
                <option value="custom">Custom text</option>
              </select>
            </div>

            <div>
              <FieldLabel>Alignment</FieldLabel>
              <AlignControl
                value={layout.headerAlign ?? "center"}
                disabled={!canEdit || layout.headerType === "none"}
                onChange={(headerAlign) => updateLayout({ ...layout, headerAlign })}
              />
            </div>

            {layout.headerType === "custom" && (
              <div>
                <FieldLabel>Text</FieldLabel>
                <input
                  type="text"
                  value={layout.headerText ?? ""}
                  disabled={!canEdit}
                  onChange={(event) => updateLayout({ ...layout, headerText: event.target.value })}
                  placeholder="Untitled draft"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </ChromeSection>

        <ChromeSection title="Footer" icon={<Hash size={15} strokeWidth={1.8} />}>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <FieldLabel>Source</FieldLabel>
              <select
                value={layout.footerType ?? "page"}
                disabled={!canEdit}
                onChange={(event) =>
                  updateLayout({
                    ...layout,
                    footerType: event.target.value as TiptapBookLayout["footerType"],
                  })
                }
                style={selectStyle}
              >
                <option value="none">None</option>
                <option value="page">Page number</option>
                <option value="custom">Custom text</option>
              </select>
            </div>

            <div>
              <FieldLabel>Alignment</FieldLabel>
              <AlignControl
                value={layout.footerAlign ?? "center"}
                disabled={!canEdit || layout.footerType === "none"}
                onChange={(footerAlign) => updateLayout({ ...layout, footerAlign })}
              />
            </div>

            {layout.footerType === "custom" && (
              <div>
                <FieldLabel>Text</FieldLabel>
                <input
                  type="text"
                  value={layout.footerText ?? ""}
                  disabled={!canEdit}
                  onChange={(event) => updateLayout({ ...layout, footerText: event.target.value })}
                  placeholder="{page} / {total}"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </ChromeSection>

        <ChromeSection title="Preview" icon={<Type size={15} strokeWidth={1.8} />}>
          <div
            style={{
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.68)",
              padding: "14px 14px 12px",
            }}
          >
            <div style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9aa0a8" }}>
                <Minus size={14} strokeWidth={1.8} />
                <span style={{ fontFamily: panelFont, fontSize: "11px" }}>
                  {layout.headerType === "none"
                    ? "No header"
                    : layout.headerType === "chapter"
                      ? "First chapter heading"
                      : layout.headerText || "Custom header"}
                </span>
              </div>
              <div style={{ height: "68px", marginLeft: "6px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9aa0a8" }}>
                <Minus size={14} strokeWidth={1.8} />
                <span style={{ fontFamily: panelFont, fontSize: "11px" }}>
                  {layout.footerType === "none"
                    ? "No footer"
                    : layout.footerType === "page"
                      ? "1"
                      : (layout.footerText || "{page} / {total}").replace("{page}", "1").replace("{total}", "8")}
                </span>
              </div>
            </div>
          </div>
        </ChromeSection>
      </div>
    </aside>
  );
}
