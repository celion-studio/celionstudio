"use client";

import Link from "next/link";
import type { Route } from "next";
import { FiArrowUpRight, FiFileText, FiRefreshCw, FiTrash2 } from "react-icons/fi";
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

function ProjectCardGlyph({ name }: { name: "open" | "restore" | "delete" }) {
  const icons = {
    delete: FiTrash2,
    open: FiArrowUpRight,
    restore: FiRefreshCw,
  };
  const Icon = icons[name];

  return <Icon aria-hidden="true" size={13} strokeWidth={1.8} />;
}

function ProjectCardPreview() {
  return (
    <div className="project-card-preview" aria-hidden="true">
      <div className="project-card-file-icon">
        <FiFileText size={17} strokeWidth={1.7} />
      </div>
      <div className="project-card-page">
        <span className="project-card-page-line" />
        <span className="project-card-page-line" />
        <span className="project-card-page-line short" />
        <span className="project-card-page-block" />
      </div>
    </div>
  );
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

  return (
    <article
      className="project-card"
      data-mode={mode}
      data-view={viewType}
    >
      {mode === "active" ? (
        <Link
          href={`/editor/${project.id}` as Route}
          className="project-link"
        >
          <ProjectCardPreview />
          <div className="project-card-body">
            {displayDate ? (
              <time dateTime={project.updatedAt} className="project-date">
                {displayDate}
              </time>
            ) : null}
            <p className="project-title">{title}</p>
          </div>

          <div className="project-action">
            <span className="project-action-text">Open</span>
            <ProjectCardGlyph name="open" />
          </div>
        </Link>
      ) : (
        <>
          <ProjectCardPreview />
          <div className="project-card-body">
            {displayDate ? (
              <time dateTime={project.deletedAt ?? project.updatedAt} className="project-date">
                Deleted {displayDate}
              </time>
            ) : null}
            <p className="project-title">{title}</p>
          </div>
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
