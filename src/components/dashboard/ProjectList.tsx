"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Trash2 } from "lucide-react";
import { CelionIconButton } from "@/components/ui/celion-controls";
import type { ProjectRecord } from "@/types/project";

type ProjectListProps = {
  projects: ProjectRecord[];
  deletingProjectId?: string;
  onDeleteProject?: (project: ProjectRecord) => void;
};

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function ProjectList({
  projects,
  deletingProjectId = "",
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div className="project-grid">
      {projects.map((project) => {
        const isDeleting = deletingProjectId === project.id;
        const title = project.title || "Untitled project";
        const updatedDate = formatProjectDate(project.updatedAt);
        const deleteButton = (
          <CelionIconButton
            disabled={isDeleting}
            label={`Delete ${title}`}
            title="Delete project"
            className="project-delete-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteProject?.(project);
            }}
          >
            <Trash2 size={13} strokeWidth={1.65} />
          </CelionIconButton>
        );

        return (
          <article
            key={project.id}
            className="project-card"
          >
            <Link
              href={`/editor/${project.id}` as Route}
              className="project-link"
            >
              <div className="project-card-body">
                {updatedDate ? (
                  <time dateTime={project.updatedAt} className="project-date">
                    {updatedDate}
                  </time>
                ) : null}
                <p className="project-title">
                  {title}
                </p>
              </div>

              <div className="project-action">
                <span className="project-action-text">Open</span>
                <ArrowRight size={12} strokeWidth={1.75} color="currentColor" />
              </div>
            </Link>
            {deleteButton}
          </article>
        );
      })}
    </div>
  );
}
