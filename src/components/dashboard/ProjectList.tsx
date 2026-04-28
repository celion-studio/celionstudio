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
  exported: "Print opened",
};

const statusTone: Record<string, { dot: string }> = {
  draft: { dot: "#b8b4aa" },
  processing_sources: { dot: "#8f969f" },
  generating: { dot: "#8f969f" },
  ready: { dot: "#5f6670" },
  revising: { dot: "#8f969f" },
  exported: { dot: "#5f6670" },
};

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? statusTone.draft;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 9px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 500, fontFamily: "'Geist', sans-serif", background: "#f7f6f3", color: "#5f6670", border: "1px solid #e5e2dc" }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: tone.dot, flexShrink: 0 }} />
      {statusLabel[status] ?? status}
    </span>
  );
}

type ProjectListProps = {
  projects: ProjectRecord[];
  surface?: "workspace" | "documents";
  deletingProjectId?: string;
  onDeleteProject?: (project: ProjectRecord) => void;
};

export function ProjectList({
  projects,
  surface = "workspace",
  deletingProjectId = "",
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) return null;

  const isDocuments = surface === "documents";
  const columns = isDocuments
    ? ["Title", "Updated", "Format", "Status", ""]
    : ["Title", "Audience", "Tone", "Status", ""];

  return (
    <div style={{ background: "#fff", border: "1px solid #ECEAE5", borderRadius: "12px", overflow: "hidden" }}>
      <div className="hidden sm:grid" style={{ gridTemplateColumns: "1fr 130px 130px 110px 44px", padding: "10px 20px", borderBottom: "1px solid #ECEAE5", background: "#FAFAF9" }}>
        {columns.map((col) => (
          <span key={col || "actions"} style={{ fontSize: "11px", fontWeight: 500, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Geist', sans-serif" }}>
            {col}
          </span>
        ))}
      </div>

      {projects.map((project, i) => {
        const isLast = i === projects.length - 1;
        const isDeleting = deletingProjectId === project.id;
        const title = project.title || (isDocuments ? "Untitled Document" : "Untitled Draft");
        const updatedDate = new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const updatedDateWithYear = new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
                  {isDocuments
                    ? `Updated ${updatedDate}`
                    : `${project.profile.targetAudience.slice(0, 24)} / ${updatedDate}`}
                </p>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <StatusBadge status={project.status} />
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
                  Updated {updatedDateWithYear}
                </p>
              </Link>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isDocuments ? updatedDateWithYear : project.profile.targetAudience.slice(0, 18)}
              </span>
              <span style={{ fontSize: "12.5px", color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isDocuments ? project.profile.pageFormat.toUpperCase() : project.profile.tone.slice(0, 18)}
              </span>
              <div>
                <StatusBadge status={project.status} />
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
