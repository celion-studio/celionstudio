"use client";

import Link from "next/link";
import type { GuideRecord } from "@/types/guide";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  processing_sources: "Processing",
  generating: "Generating",
  ready: "Ready",
  revising: "Revising",
  exported: "Exported",
};

const statusColor: Record<string, { bg: string; text: string }> = {
  draft:              { bg: "#F0EEE9", text: "#71717A" },
  processing_sources: { bg: "#EEF3FF", text: "#3461D1" },
  generating:         { bg: "#EEF3FF", text: "#3461D1" },
  ready:              { bg: "#ECFDF5", text: "#059669" },
  revising:           { bg: "#FFFBEB", text: "#D97706" },
  exported:           { bg: "#F0FDF4", text: "#16A34A" },
};

export function GuideList({ guides }: { guides: GuideRecord[] }) {
  if (guides.length === 0) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #ECEAE5", borderRadius: "12px", overflow: "hidden" }}>
      {/* Desktop table header — hidden on small screens */}
      <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 130px 130px 110px", padding: "10px 20px", borderBottom: "1px solid #ECEAE5", background: "#FAFAF9" }}>
        {["Title", "Audience", "Tone", "Status"].map((col) => (
          <span key={col} style={{ fontSize: "11px", fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Geist', sans-serif" }}>
            {col}
          </span>
        ))}
      </div>

      {guides.map((guide, i) => {
        const badge = statusColor[guide.status] ?? statusColor.draft;
        const isLast = i === guides.length - 1;
        return (
          <Link
            key={guide.id}
            href={`/builder/${guide.id}`}
            style={{
              display: "block",
              textDecoration: "none",
              borderBottom: isLast ? "none" : "1px solid #ECEAE5",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Mobile card view */}
            <div className="flex sm:hidden" style={{ padding: "14px 16px", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {guide.title || "Untitled Draft"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#A1A1AA" }}>
                  {guide.profile.targetAudience.slice(0, 24)} · {new Date(guide.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", background: badge.bg, color: badge.text }}>
                {statusLabel[guide.status] ?? guide.status}
              </span>
            </div>

            {/* Desktop table row */}
            <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 130px 130px 110px", alignItems: "center", padding: "14px 20px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "340px" }}>
                  {guide.title || "Untitled Draft"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "#A1A1AA" }}>
                  Updated {new Date(guide.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {guide.profile.targetAudience.slice(0, 18)}
              </span>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {guide.profile.tone.slice(0, 18)}
              </span>
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", background: badge.bg, color: badge.text }}>
                  {statusLabel[guide.status] ?? guide.status}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
