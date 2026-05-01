"use client";

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
      <div style={{ padding: "18px", borderRadius: "8px", background: "#f7f6f4", border: "1px solid #e8e5e0" }}>
        <h3 style={{ fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1a1714", marginBottom: "12px" }}>
          Summary
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            ["Title", title || "-"],
            ["Author", author || "-"],
            ["Style", ebookStyle ? EBOOK_STYLE_LABELS[ebookStyle] : "-"],
            ["Format", "A5 sales preview"],
            ["Accent", accentColor],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#8a867e", width: "52px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#1a1714", fontWeight: 500 }}>
                {label === "Accent" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: value, display: "inline-block", border: "1px solid rgba(0,0,0,0.1)" }} />
                    {value}
                  </span>
                ) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {generating ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "24px 0" }}>
          <Loader2 size={22} style={{ color: "#1a1714", animation: "spin 1s linear infinite" }} />
          <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13.5px", color: "#8a867e", textAlign: "center" }}>
            Generating your ebook. This may take 30-90 seconds...
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "14px 16px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Sparkles size={15} style={{ color: "#16a34a", marginTop: "1px", flexShrink: 0 }} />
          <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#166534", lineHeight: 1.5 }}>
            Celion will render the approved plan into a fixed A5 HTML/CSS sales-preview ebook in the {ebookStyle ? EBOOK_STYLE_LABELS[ebookStyle] : "selected"} style. You can edit the text after generation.
          </p>
        </div>
      )}
    </div>
  );
}
