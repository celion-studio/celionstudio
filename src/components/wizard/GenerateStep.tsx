"use client";

import { BookOpen, FileText, Loader2, Palette } from "lucide-react";
import { getPageFormatSpec, type PageFormat, type PageSize } from "@/lib/page-format";
import type { WizardTone } from "@/store/useProjectWizardStore";

const toneLabels: Record<WizardTone, string> = {
  preserve: "Keep source voice",
  clear: "Clear and concise",
  practical: "Practical",
  editorial: "Editorial",
  friendly: "Friendly",
};

type GenerateStepProps = {
  title: string;
  author: string;
  targetAudience: string;
  tone: WizardTone;
  fileCount: number;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  generating: boolean;
};

export function GenerateStep({
  title,
  author,
  targetAudience,
  tone,
  fileCount,
  pageFormat,
  customPageSize,
  generating,
}: GenerateStepProps) {
  const format = getPageFormatSpec(pageFormat, customPageSize);

  if (generating) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 20px",
          gap: "14px",
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "#8a867e" }} />
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a1714",
            fontFamily: "'Geist', sans-serif",
          }}
        >
          Generating your ebook...
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "12.5px",
            color: "#8a867e",
            fontFamily: "'Geist', sans-serif",
          }}
        >
          Creating the editable draft
        </p>
      </div>
    );
  }

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <BookOpen size={14} />,
      label: "Title",
      value: title || "-",
    },
    {
      icon: <FileText size={14} />,
      label: "Author",
      value: author || "-",
    },
    {
      icon: <FileText size={14} />,
      label: "Reader",
      value: targetAudience || "-",
    },
    {
      icon: <Palette size={14} />,
      label: "Tone",
      value: toneLabels[tone],
    },
    {
      icon: <FileText size={14} />,
      label: "Sources",
      value: `${fileCount} file${fileCount === 1 ? "" : "s"}`,
    },
    {
      icon: <BookOpen size={14} />,
      label: "Format",
      value: `${format.label} (${format.widthMm} x ${format.heightMm} mm)`,
    },
  ];

  return (
    <div
      style={{
        border: "1px solid #ebe7dd",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {rows.map(({ icon, label, value }, index) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "13px 18px",
            borderBottom: index < rows.length - 1 ? "1px solid #f0ece3" : "none",
            background: "#ffffff",
          }}
        >
          <span style={{ color: "#b8b4aa", flexShrink: 0 }}>{icon}</span>
          <span
            style={{
              width: "80px",
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#b8b4aa",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            {label}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: "13.5px",
              color: "#1a1714",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
