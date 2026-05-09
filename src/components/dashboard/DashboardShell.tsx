"use client";

import type { Route } from "next";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { useCreateProjectNavigation } from "@/components/dashboard/use-create-project-navigation";
import { authClient } from "@/lib/auth-client";
import { buildAuthHref, getSafeAuthNext } from "@/lib/auth-redirect";
import { CelionButton, CelionButtonLink } from "@/components/ui/celion-controls";
import type { SidebarItemKey } from "@/components/dashboard/WorkspaceSidebar";
import type { ProjectRecord } from "@/types/project";

type DashboardShellProps = {
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  activeItem?: SidebarItemKey;
};

const workspaceCopy = {
  breadcrumbCurrent: "All projects",
  heading: "Your projects",
  description: "All your projects and works in progress.",
  primaryActionLabel: "New project",
  blankTitle: "Untitled project",
  emptyTitle: "No projects yet",
  emptyDescription: "Upload a source file or start fresh. Celion shapes it into a structured project.",
  emptyAction: "Create first project",
  loadingLabel: "Loading projects...",
} as const;

export function DashboardShell({
  isSignedIn,
  initialUserName,
  initialUserEmail,
  activeItem = "workspace",
}: DashboardShellProps) {
  const searchParams = useSearchParams();
  const {
    createAndOpenProject,
    createProjectError,
    creatingProject,
    setCreateProjectError,
  } = useCreateProjectNavigation();
  const hasVerifier = searchParams.has("neon_auth_session_verifier");
  const authNext = getSafeAuthNext(searchParams.get("next"));
  const [resolvedSignedIn, setResolvedSignedIn] = useState(isSignedIn);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState("");
  const visibleError = error || createProjectError;
  const showLoading = loading;
  const copy = workspaceCopy;
  const handleVerifierError = useCallback(() => {
    setResolvedSignedIn(false);
    setLoading(false);
  }, []);

  async function fetchProjects() {
    return fetch("/api/projects", {
      method: "GET",
      cache: "no-store",
    });
  }

  useEffect(() => {
    if (!hasVerifier) {
      return;
    }

    let active = true;

    async function finalizeSignIn() {
      try {
        const result = await authClient.getSession();
        if (!active) return;

        if (result?.error) {
          handleVerifierError();
          return;
        }

        window.location.replace(authNext);
      } catch (err) {
        console.error("Session verification failed", err);
        if (active) {
          handleVerifierError();
        }
      }
    }

    void finalizeSignIn();

    return () => {
      active = false;
    };
  }, [authNext, handleVerifierError, hasVerifier]);

  useEffect(() => {
    if (hasVerifier) {
      return;
    }

    let active = true;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchProjects();

        if (response.status === 401) {
          if (active) {
            setResolvedSignedIn(false);
            setProjects([]);
          }
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(payload?.message ?? "Could not load your workspace.");
        }

        const payload = (await response.json()) as { projects: ProjectRecord[] };

        if (active) {
          setResolvedSignedIn(true);
          setProjects(payload.projects);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load your workspace.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, [hasVerifier]);

  async function deleteProject(project: ProjectRecord) {
    const label = project.title || copy.blankTitle;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    const previousProjects = projects;
    setDeletingProjectId(project.id);
    setError("");
    setProjects((current) => current.filter((item) => item.id !== project.id));

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Could not delete this project.");
      }
    } catch (caught) {
      setProjects(previousProjects);
      setError(caught instanceof Error ? caught.message : "Could not delete this project.");
    } finally {
      setDeletingProjectId("");
    }
  }

  async function handleCreateProject() {
    setError("");
    setCreateProjectError("");
    await createAndOpenProject();
  }

  return (
    <WorkspaceLayout
      activeItem={activeItem}
      isSignedIn={resolvedSignedIn}
      initialUserName={initialUserName}
      initialUserEmail={initialUserEmail}
      breadcrumbCurrent={copy.breadcrumbCurrent}
    >
      <div className="dashboard-head">
        <div>
          <h1 className="dashboard-title">
            {copy.heading}
          </h1>
          <p className="dashboard-description">
            {copy.description}
          </p>
        </div>
        {resolvedSignedIn ? (
          <CelionButton
            onClick={handleCreateProject}
            disabled={creatingProject}
            variant="primary"
            className="dashboard-primary-button"
          >
            {creatingProject ? "Creating..." : copy.primaryActionLabel}
          </CelionButton>
        ) : null}
      </div>

      {visibleError ? (
        <div className="dashboard-error">
          <p>{visibleError}</p>
        </div>
      ) : null}

      {showLoading ? (
        <div className="dashboard-loading">
          <p>
            {copy.loadingLabel}
          </p>
        </div>
      ) : null}

      {!showLoading && resolvedSignedIn ? (
        <ProjectList
          projects={projects}
          deletingProjectId={deletingProjectId}
          onDeleteProject={deleteProject}
        />
      ) : null}

      {!showLoading && !resolvedSignedIn ? (
        <DashboardEmptyState
          icon={BookOpen}
          title="Sign in to continue"
          description="Your workspace is account-backed. Sign in to access your projects."
          action={
            <CelionButtonLink
              href={buildAuthHref("sign-in", "/dashboard") as Route}
              variant="primary"
              className="dashboard-primary-button"
            >
              Return to sign in
            </CelionButtonLink>
          }
        />
      ) : null}

      {!showLoading && resolvedSignedIn && projects.length === 0 ? (
        <DashboardEmptyState
          icon={FileText}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          maxWidth="300px"
          action={
            <CelionButton
              onClick={handleCreateProject}
              disabled={creatingProject}
              variant="primary"
              className="dashboard-primary-button"
            >
              <FileText size={13} strokeWidth={2.2} />
              {creatingProject ? "Creating..." : copy.emptyAction}
            </CelionButton>
          }
        />
      ) : null}
    </WorkspaceLayout>
  );
}
