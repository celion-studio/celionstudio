"use client";

import { Loader2 } from "lucide-react";
import type { EbookOutline } from "@/types/project";

type Props = {
  outline: EbookOutline | null;
  loading: boolean;
};

export function OutlineStep({ outline, loading }: Props) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "12px" }}>
        <Loader2 size={24} style={{ color: "#1a1714", animation: "spin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13.5px", color: "#8a867e" }}>
          Generating outline...
        </p>
      </div>
    );
  }

  if (!outline) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "13.5px", color: "#8a867e" }}>
          No outline yet. Click Continue to generate.
        </p>
      </div>
    );
  }

  const totalPages = outline.chapters.reduce((sum, ch) => sum + ch.pageCount, 0);

  return (
    <div className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#8a867e" }}>
          {outline.chapters.length} chapters · {totalPages} pages total
        </p>
      </div>
      {outline.chapters.map((ch, i) => (
        <div
          key={i}
          style={{
            padding: "14px 16px",
            borderRadius: "8px",
            border: "1.5px solid #e1e4e8",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "13.5px", fontWeight: 500, color: "#1a1714", marginBottom: "4px" }}>
                {i + 1}. {ch.title}
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#8a867e", lineHeight: 1.5 }}>
                {ch.summary}
              </div>
            </div>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "11px", fontWeight: 500, color: "#b8b4aa", flexShrink: 0, marginTop: "2px" }}>
              {ch.pageCount}p
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
