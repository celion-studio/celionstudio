"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { ProjectSummary } from "@/lib/projects";

type ProjectListProps = {
  projects: ProjectSummary[];
  mode?: "active" | "trash";
  processingProjectId?: string;
  onDeleteProject?: (project: ProjectSummary) => void;
  onPermanentDeleteProject?: (project: ProjectSummary) => void;
  onRestoreProject?: (project: ProjectSummary) => void;
};

export function ProjectList({
  projects,
  mode = "active",
  processingProjectId = "",
  onDeleteProject,
  onPermanentDeleteProject,
  onRestoreProject,
}: ProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <motion.div
      className="project-grid"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.035 },
        },
      }}
    >
      <AnimatePresence mode="popLayout">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            mode={mode}
            processing={processingProjectId === project.id}
            project={project}
            onDeleteProject={onDeleteProject}
            onPermanentDeleteProject={onPermanentDeleteProject}
            onRestoreProject={onRestoreProject}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
