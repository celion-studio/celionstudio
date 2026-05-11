"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/projects";

type UseDashboardProjectsInput = {
  blankTitle: string;
  initialError: string;
  initialProjects: ProjectSummary[];
  loadingFromVerifier: boolean;
  resetKey: string;
};

async function projectResponseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

export function useDashboardProjects({
  blankTitle,
  initialError,
  initialProjects,
  loadingFromVerifier,
  resetKey,
}: UseDashboardProjectsInput) {
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [loading, setLoading] = useState(loadingFromVerifier);
  const [error, setError] = useState(initialError);
  const [processingProjectId, setProcessingProjectId] = useState("");
  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    setProjects(initialProjects);
    setError(initialError);
    setProcessingProjectId("");
    setLoading(loadingFromVerifier);
  }, [initialError, initialProjects, loadingFromVerifier, resetKey]);

  const deleteProject = useCallback(async (project: ProjectSummary) => {
    const label = project.title || blankTitle;
    if (!window.confirm(`Move "${label}" to trash? You can restore it later.`)) return;

    const previousProjects = projects;
    setProcessingProjectId(project.id);
    setError("");
    setProjects((current) => current.filter((item) => item.id !== project.id));

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await projectResponseMessage(response, "Could not delete this project."));
      }
    } catch (caught) {
      setProjects(previousProjects);
      setError(caught instanceof Error ? caught.message : "Could not move this project to trash.");
    } finally {
      setProcessingProjectId("");
    }
  }, [blankTitle, projects]);

  const restoreProject = useCallback(async (project: ProjectSummary) => {
    const previousProjects = projects;
    setProcessingProjectId(project.id);
    setError("");
    setProjects((current) => current.filter((item) => item.id !== project.id));

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "restore" }),
      });

      if (!response.ok) {
        throw new Error(await projectResponseMessage(response, "Could not restore this project."));
      }
    } catch (caught) {
      setProjects(previousProjects);
      setError(caught instanceof Error ? caught.message : "Could not restore this project.");
    } finally {
      setProcessingProjectId("");
    }
  }, [projects]);

  const permanentlyDeleteProject = useCallback(async (project: ProjectSummary) => {
    const label = project.title || blankTitle;
    if (!window.confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;

    const previousProjects = projects;
    setProcessingProjectId(project.id);
    setError("");
    setProjects((current) => current.filter((item) => item.id !== project.id));

    try {
      const response = await fetch(`/api/projects/${project.id}?permanent=true`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await projectResponseMessage(response, "Could not permanently delete this project."));
      }
    } catch (caught) {
      setProjects(previousProjects);
      setError(caught instanceof Error ? caught.message : "Could not permanently delete this project.");
    } finally {
      setProcessingProjectId("");
    }
  }, [blankTitle, projects]);

  return {
    clearError: () => setError(""),
    deleteProject,
    error,
    loading,
    permanentlyDeleteProject,
    processingProjectId,
    projects,
    restoreProject,
    stopLoading,
  };
}
