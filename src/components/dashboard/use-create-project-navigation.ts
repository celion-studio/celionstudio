"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { createDraftProject } from "@/lib/project-client";

type NavigationMode = "push" | "replace";

export function useCreateProjectNavigation(mode: NavigationMode = "push") {
  const router = useRouter();
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState("");

  const createAndOpenProject = useCallback(async () => {
    if (creatingProject) return null;

    setCreatingProject(true);
    setCreateProjectError("");

    try {
      const project = await createDraftProject();
      const editorPath = `/editor/${project.id}` as Route;
      if (mode === "replace") {
        router.replace(editorPath);
      } else {
        router.push(editorPath);
      }
      return project;
    } catch (caught) {
      setCreateProjectError(caught instanceof Error ? caught.message : "Could not create a project.");
      setCreatingProject(false);
      return null;
    }
  }, [creatingProject, mode, router]);

  return {
    createAndOpenProject,
    createProjectError,
    creatingProject,
    setCreateProjectError,
  };
}
