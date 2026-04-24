"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { ProjectRecord } from "@/types/project";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  processing_sources: "Processing",
  generating: "Generating",
  ready: "Ready",
  revising: "Revising",
  exported: "Exported",
};

const statusColor: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F0EEE9", text: "#71717A" },
  processing_sources: { bg: "#EEF3FF", text: "#3461D1" },
  generating: { bg: "#EEF3FF", text: "#3461D1" },
  ready: { bg: "#ECFDF5", text: "#059669" },
  revising: { bg: "#FFFBEB", text: "#D97706" },
  exported: { bg: "#F0FDF4", text: "#16A34A" },
};

type ProjectListProps = {
  projects: ProjectRecord[];
  deletingProjectId?: string;
  onDeleteProject?: (project: ProjectRecord) => void;
};

export function ProjectList({
  projects,
  deletingProjectId = "",
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #ECEAE5", borderRadius: "12px", overflow: "hidden" }}>
      <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 130px 130px 110px 44px", padding: "10px 20px", borderBottom: "1px solid #ECEAE5", background: "#FAFAF9" }}>
        {["Title", "Audience", "Tone", "Status", ""].map((col) => (
          <span key={col || "actions"} style={{ fontSize: "11px", fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Geist', sans-serif" }}>
            {col}
          </span>
        ))}
      </div>

      {projects.map((project, i) => {
        const badge = statusColor[project.status] ?? statusColor.draft;
        const isLast = i === projects.length - 1;
        const isDeleting = deletingProjectId === project.id;
        const title = project.title || "Untitled Draft";
        const deleteButton = (
          <button
            type="button"
            disabled={isDeleting}
            title="Delete project"
            aria-label={`Delete ${title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteProject?.(project);
            }}
            style={{
              width: "30px",
              height: "30px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ECEAE5",
              borderRadius: "6px",
              background: isDeleting ? "#F7F6F3" : "#fff",
              color: isDeleting ? "#C9C3B8" : "#A1A1AA",
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        );

        return (
          <div
            key={project.id}
            style={{
              display: "block",
              borderBottom: isLast ? "none" : "1px solid #ECEAE5",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="flex sm:hidden" style={{ padding: "14px 16px", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <Link
                href={`/editor/${project.id}`}
                style={{ flex: 1, minWidth: 0, textDecorationLine: "none" }}
              >
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#A1A1AA" }}>
                  {project.profile.targetAudience.slice(0, 24)} / {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", background: badge.bg, color: badge.text }}>
                  {statusLabel[project.status] ?? project.status}
                </span>
                {deleteButton}
              </div>
            </div>

            <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 130px 130px 110px 44px", alignItems: "center", padding: "14px 20px" }}>
              <Link
                href={`/editor/${project.id}`}
                style={{ minWidth: 0, textDecorationLine: "none" }}
              >
                <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "340px" }}>
                  {title}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "#A1A1AA" }}>
                  Updated {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </Link>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.profile.targetAudience.slice(0, 18)}
              </span>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.profile.tone.slice(0, 18)}
              </span>
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", background: badge.bg, color: badge.text }}>
                  {statusLabel[project.status] ?? project.status}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {deleteButton}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
