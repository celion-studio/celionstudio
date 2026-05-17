"use client";

import Link from "next/link";
import type { Route } from "next";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { CelionButton, CelionIconButton } from "@/components/ui/celion-controls";
import type { ProjectSummary } from "@/lib/projects";

type ProjectCardProps = {
  mode: "active" | "trash";
  viewType?: "grid" | "list";
  processing: boolean;
  project: ProjectSummary;
  onDeleteProject?: (project: ProjectSummary) => void;
  onPermanentDeleteProject?: (project: ProjectSummary) => void;
  onRestoreProject?: (project: ProjectSummary) => void;
};

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

const CARD_COLORS = [
  { bg: "#1a1f2e" },
  { bg: "#2d2f33" },
  { bg: "#3d2e4a" },
  { bg: "#2e4a3a" },
  { bg: "#4a3728" },
  { bg: "#1a2e3a" },
  { bg: "#3a2e3a" },
  { bg: "#2e3a3a" },
];

function getProjectColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

function ProjectCardGlyph({ name }: { name: "restore" | "delete" }) {
  const icons = {
    delete: FiTrash2,
    restore: FiRefreshCw,
  };
  const Icon = icons[name];

  return <Icon aria-hidden="true" size={13} strokeWidth={1.8} />;
}

export function ProjectCard({
  mode,
  viewType = "grid",
  processing,
  project,
  onDeleteProject,
  onPermanentDeleteProject,
  onRestoreProject,
}: ProjectCardProps) {
  const title = project.title || "Untitled project";
  const displayDate = formatProjectDate(project.deletedAt ?? project.updatedAt);
  const deleteButton = mode === "active" ? (
    <CelionIconButton
      disabled={processing}
      label={`Move ${title} to trash`}
      title="Move to trash"
      className="project-delete-button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDeleteProject?.(project);
      }}
    >
      <ProjectCardGlyph name="delete" />
    </CelionIconButton>
  ) : null;

  const cardHead = (
    <div className="project-card-head">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="project-card-head-mark"
      >
        <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
      </svg>
    </div>
  );

  const cardBody = (
    <div className="project-card-body">
      <p className="project-title">{title}</p>
      {displayDate ? (
        <time
          dateTime={mode === "active" ? project.updatedAt : (project.deletedAt ?? project.updatedAt)}
          className="project-date"
        >
          {mode === "trash" ? `Deleted ${displayDate}` : displayDate}
        </time>
      ) : null}
    </div>
  );

  return (
    <article
      className="project-card"
      data-mode={mode}
      data-view={viewType}
    >
      {mode === "active" ? (
        <Link
          href={`/editor/${project.id}` as Route}
          prefetch={false}
          className="project-link"
        >
          {cardHead}
          {cardBody}
        </Link>
      ) : (
        <>
          {cardHead}
          {cardBody}
        </>
      )}

      {mode === "trash" ? (
        <div className="project-trash-actions">
          <CelionButton
            size="sm"
            variant="secondary"
            disabled={processing}
            className="project-restore-button"
            onClick={() => onRestoreProject?.(project)}
          >
            <ProjectCardGlyph name="restore" />
            Restore
          </CelionButton>
          <CelionIconButton
            disabled={processing}
            label={`Permanently delete ${title}`}
            title="Delete forever"
            onClick={() => onPermanentDeleteProject?.(project)}
          >
            <ProjectCardGlyph name="delete" />
          </CelionIconButton>
        </div>
      ) : null}
      {deleteButton}
    </article>
  );
}
