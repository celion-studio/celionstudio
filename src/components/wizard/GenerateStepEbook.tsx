"use client";

import type { CSSProperties } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { EBOOK_STYLE_LABELS } from "@/lib/ebook-style";
import type { EbookStyle } from "@/types/project";

type Props = {
  title: string;
  author: string;
  ebookStyle: EbookStyle | null;
  accentColor: string;
  generating: boolean;
};

export function GenerateStepEbook({ title, author, ebookStyle, accentColor, generating }: Props) {
  return (
    <div className="space-y-5">
      <div className="wizard-generate-summary">
        <h3 className="wizard-generate-title">
          Summary
        </h3>
        <div className="wizard-generate-summary-list">
          {[
            ["Title", title || "-"],
            ["Author", author || "-"],
            ["Style", ebookStyle ? EBOOK_STYLE_LABELS[ebookStyle] : "-"],
            ["Format", "A5 ebook"],
            ["Accent", accentColor],
          ].map(([label, value]) => (
            <div key={label} className="wizard-generate-summary-row">
              <span className="wizard-generate-summary-label">{label}</span>
              <span className="wizard-generate-summary-value">
                {label === "Accent" ? (
                  <span
                    className="wizard-generate-accent"
                    style={{ "--wizard-accent-color": value } as CSSProperties}
                  >
                    <span className="wizard-generate-accent-dot" />
                    {value}
                  </span>
                ) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {generating ? (
        <div className="wizard-generate-loading">
          <Loader2 size={22} className="wizard-generate-spinner" />
          <p className="wizard-generate-loading-text">
            Generating your ebook. This may take 30-90 seconds...
          </p>
        </div>
      ) : (
        <div className="wizard-generate-ready">
          <Sparkles size={15} className="wizard-generate-ready-icon" />
          <p className="wizard-generate-ready-text">
            Celion will render the approved plan into an editable A5 ebook in the {ebookStyle ? EBOOK_STYLE_LABELS[ebookStyle] : "selected"} style. You can edit the text after generation.
          </p>
        </div>
      )}
    </div>
  );
}
