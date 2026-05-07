"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { useCreateProjectNavigation } from "@/components/dashboard/use-create-project-navigation";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";
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
  const resolvedSignedIn = isSignedIn;
  const resolvedUserName = initialUserName;
  const resolvedUserEmail = initialUserEmail;

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(isSignedIn || hasVerifier);
  const [error, setError] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState("");
  const visibleError = error || createProjectError;
  const showLoading = loading;
  const copy = workspaceCopy;

  async function fetchProjects() {
    const response = await fetch("/api/projects", {
      method: "GET",
      cache: "no-store",
    });

    if (response.status !== 401) {
      return response;
    }

    await authClient.getSession();

    return fetch("/api/projects", {
      method: "GET",
      cache: "no-store",
    });
  }

  useEffect(() => {
    if (!hasVerifier) return;

    let active = true;

    async function finalizeSession() {
      try {
        const result = await authClient.getSession();

        if (!result?.error && active) {
          const next = new URLSearchParams(searchParams.toString());
          next.delete("neon_auth_session_verifier");
          const path = next.size > 0 ? `/dashboard?${next.toString()}` : "/dashboard";
          window.location.replace(path);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    }

    void finalizeSession();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasVerifier) {
      return;
    }

    if (!resolvedSignedIn) {
      setProjects([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchProjects();

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(payload?.message ?? "Could not load your workspace.");
        }

        const payload = (await response.json()) as { projects: ProjectRecord[] };

        if (active) {
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
  }, [hasVerifier, resolvedSignedIn]);

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
      initialUserName={resolvedUserName}
      initialUserEmail={resolvedUserEmail}
      breadcrumbCurrent={copy.breadcrumbCurrent}
    >
      <div
        style={{
          marginBottom: "28px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: CELION_FONT.display,
              fontSize: "22px",
              fontWeight: 560,
              letterSpacing: "-0.03em",
              color: CELION_COLOR.text,
            }}
          >
            {copy.heading}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: CELION_COLOR.muted }}>
            {copy.description}
          </p>
        </div>
        {resolvedSignedIn ? (
          <CelionButton
            onClick={handleCreateProject}
            disabled={creatingProject}
            variant="primary"
            style={{ padding: "0 18px" }}
          >
            {creatingProject ? "Creating..." : copy.primaryActionLabel}
          </CelionButton>
        ) : null}
      </div>

      {visibleError ? (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#FFF5F2",
            borderRadius: CELION_RADIUS.control,
            border: "1px solid #FEDDCF",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", color: "#9b4c19" }}>{visibleError}</p>
        </div>
      ) : null}

      {showLoading ? (
        <div style={{ padding: "72px 0", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: CELION_COLOR.mutedSoft,
              fontFamily: CELION_FONT.display,
            }}
          >
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
              href="/"
              variant="primary"
              style={{ padding: "0 18px" }}
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
              style={{ padding: "0 18px" }}
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
