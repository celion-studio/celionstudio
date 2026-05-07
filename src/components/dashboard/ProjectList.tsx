"use client";

import type { CSSProperties, MouseEvent } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Trash2 } from "lucide-react";
import {
  CELION_COLOR,
  CELION_FONT,
} from "@/components/ui/celion-style";
import { CelionIconButton } from "@/components/ui/celion-controls";
import type { ProjectRecord } from "@/types/project";

type ProjectListProps = {
  projects: ProjectRecord[];
  deletingProjectId?: string;
  onDeleteProject?: (project: ProjectRecord) => void;
};

const PROJECT_CARD_HEIGHT = 138;

const projectGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
  gap: "12px",
  alignItems: "stretch",
};

const projectCardStyle: CSSProperties = {
  height: `${PROJECT_CARD_HEIGHT}px`,
  position: "relative",
  border: `1px solid ${CELION_COLOR.lineSoft}`,
  borderRadius: "6px",
  background: CELION_COLOR.panel,
  overflow: "hidden",
};

const projectLinkStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  textDecorationLine: "none",
};

const projectBodyStyle: CSSProperties = {
  padding: "16px 48px 14px 16px",
  flex: "1 1 auto",
  minHeight: 0,
};

const projectDateStyle: CSSProperties = {
  display: "block",
  marginBottom: "11px",
  fontSize: "11px",
  letterSpacing: "0.05em",
  color: CELION_COLOR.mutedSoft,
  fontFamily: CELION_FONT.display,
};

const projectTitleStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  minHeight: "42px",
  overflow: "hidden",
  margin: 0,
  fontSize: "17px",
  lineHeight: 1.24,
  fontWeight: 500,
  fontFamily: CELION_FONT.display,
  color: CELION_COLOR.text,
};

const projectActionStyle: CSSProperties = {
  height: "42px",
  padding: "0 16px",
  borderTop: `1px solid ${CELION_COLOR.lineSoft}`,
  background: CELION_COLOR.panel,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexShrink: 0,
  boxSizing: "border-box",
};

const projectActionTextStyle: CSSProperties = {
  fontSize: "12px",
  color: CELION_COLOR.text,
  fontWeight: 500,
  fontFamily: CELION_FONT.display,
};

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function handleCardEnter(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.borderColor = "#d7d2c8";
}

function handleCardLeave(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.borderColor = CELION_COLOR.lineSoft;
}

function handleSoftActionEnter(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.background = CELION_COLOR.panelSoft;
}

function handleSoftActionLeave(event: MouseEvent<HTMLElement>) {
  event.currentTarget.style.background = CELION_COLOR.panel;
}

export function ProjectList({
  projects,
  deletingProjectId = "",
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div style={projectGridStyle}>
      {projects.map((project) => {
        const isDeleting = deletingProjectId === project.id;
        const title = project.title || "Untitled project";
        const updatedDate = formatProjectDate(project.updatedAt);
        const deleteButton = (
          <CelionIconButton
            disabled={isDeleting}
            label={`Delete ${title}`}
            title="Delete project"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteProject?.(project);
            }}
            style={{ position: "absolute", top: "12px", right: "12px" }}
          >
            <Trash2 size={13} strokeWidth={1.65} />
          </CelionIconButton>
        );

        return (
          <article
            key={project.id}
            style={projectCardStyle}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            <Link
              href={`/editor/${project.id}` as Route}
              style={projectLinkStyle}
            >
              <div style={projectBodyStyle}>
                {updatedDate ? (
                  <time dateTime={project.updatedAt} style={projectDateStyle}>
                    {updatedDate}
                  </time>
                ) : null}
                <p style={projectTitleStyle}>
                  {title}
                </p>
              </div>

              <div
                onMouseEnter={handleSoftActionEnter}
                onMouseLeave={handleSoftActionLeave}
                style={projectActionStyle}
              >
                <span style={projectActionTextStyle}>Open</span>
                <ArrowRight size={12} strokeWidth={1.75} color={CELION_COLOR.muted} />
              </div>
            </Link>
            {deleteButton}
          </article>
        );
      })}
    </div>
  );
}
