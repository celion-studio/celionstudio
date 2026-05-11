"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiBookOpen,
  FiFileText,
  FiGrid,
  FiMenu,
  FiTarget,
} from "react-icons/fi";
import type { ProjectSummary } from "@/lib/projects";

type DashboardHomeProps = {
  creatingProject: boolean;
  error?: string;
  projects: ProjectSummary[];
  userName: string | null;
  onCreateProject: () => void;
};

const quickStarts = [
  {
    label: "Creator guide",
    icon: "guide",
    prompt: "Create a practical guide from my notes.",
  },
  {
    label: "Workbook",
    icon: "workbook",
    prompt: "Turn this material into a workbook with exercises.",
  },
  {
    label: "Research brief",
    icon: "brief",
    prompt: "Shape this research into a clear report.",
  },
  {
    label: "Lead magnet",
    icon: "magnet",
    prompt: "Make a concise lead magnet for my audience.",
  },
] as const;

function firstName(name: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently edited";

  return `Edited ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function DashboardHomeGlyph({
  name,
}: {
  name: "arrow" | "brief" | "empty" | "guide" | "magnet" | "source" | "workbook";
}) {
  const icons = {
    arrow: FiArrowUpRight,
    brief: FiFileText,
    empty: FiFileText,
    guide: FiBookOpen,
    magnet: FiTarget,
    source: FiMenu,
    workbook: FiGrid,
  };
  const Icon = icons[name];

  return <Icon aria-hidden="true" size={14} strokeWidth={1.8} />;
}

function RecentProjectPreview() {
  return (
    <div className="dashboard-home-project-preview" aria-hidden="true">
      <div className="dashboard-home-project-page">
        <FiFileText size={15} strokeWidth={1.7} />
        <span />
        <span />
        <span />
        <i />
      </div>
    </div>
  );
}

const homeMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const homeTransition = {
  duration: 0.34,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function DashboardHome({
  creatingProject,
  error = "",
  projects,
  userName,
  onCreateProject,
}: DashboardHomeProps) {
  const recentProjects = projects.slice(0, 3);
  const [prompt, setPrompt] = useState("");

  return (
    <motion.div
      className="dashboard-home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="dashboard-home-intake" aria-label="Start an ebook">
        <motion.div
          className="dashboard-home-copy"
          variants={homeMotion}
          initial="hidden"
          animate="visible"
          transition={homeTransition}
        >
          <h1>{firstName(userName)}, what are we turning into pages?</h1>
        </motion.div>

        <motion.div
          className="dashboard-home-composer"
          variants={homeMotion}
          initial="hidden"
          animate="visible"
          transition={{ ...homeTransition, delay: 0.06 }}
        >
          <div className="dashboard-home-composer-top">
            <span>New ebook brief</span>
            <span>{prompt.length}/1000</span>
          </div>
          <textarea
            aria-label="Describe your ebook idea"
            maxLength={1000}
            placeholder="Paste the idea, audience, promise, or raw notes you want to turn into pages..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="dashboard-home-composer-footer">
            <span className="dashboard-home-source-hint">
              <DashboardHomeGlyph name="source" />
              Notes, research, transcripts
            </span>
            <button
              type="button"
              className="dashboard-home-start-button"
              disabled={creatingProject}
              onClick={onCreateProject}
            >
              {creatingProject ? "Opening..." : "Start project"}
              <DashboardHomeGlyph name="arrow" />
            </button>
          </div>
        </motion.div>

        {error ? (
          <p className="dashboard-home-error">{error}</p>
        ) : null}

        <motion.div
          className="dashboard-home-quick-starts"
          aria-label="Quick starts"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 1 },
            visible: {
              opacity: 1,
              transition: { delayChildren: 0.14, staggerChildren: 0.035 },
            },
          }}
        >
          {quickStarts.map((item) => (
            <motion.button
              key={item.label}
              type="button"
              onClick={() => setPrompt(item.prompt)}
              variants={homeMotion}
              transition={homeTransition}
            >
              <DashboardHomeGlyph name={item.icon} />
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </section>

      <motion.section
        className="dashboard-home-recent"
        aria-label="Recent projects"
        variants={homeMotion}
        initial="hidden"
        animate="visible"
        transition={{ ...homeTransition, delay: 0.16 }}
      >
        <div className="dashboard-home-section-head">
          <h2>Recent projects</h2>
          <Link href={"/dashboard?view=projects" as Route}>
            View all
            <DashboardHomeGlyph name="arrow" />
          </Link>
        </div>

        {recentProjects.length > 0 ? (
          <div className="dashboard-home-recent-grid">
            {recentProjects.map((project) => {
              const title = project.title || "Untitled project";

              return (
                <motion.div
                  key={project.id}
                  variants={homeMotion}
                  transition={homeTransition}
                >
                  <Link
                    href={`/editor/${project.id}` as Route}
                    className="dashboard-home-project"
                  >
                    <RecentProjectPreview />
                    <strong>{title}</strong>
                    <span>{formatProjectDate(project.updatedAt)}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-home-empty">
            <DashboardHomeGlyph name="empty" />
            <p>Your first ebook will appear here.</p>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
