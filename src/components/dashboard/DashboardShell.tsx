"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { useCreateProjectNavigation } from "@/components/dashboard/use-create-project-navigation";
import { useDashboardProjects } from "@/components/dashboard/use-dashboard-projects";
import { CelionButton } from "@/components/ui/celion-controls";
import type { SidebarItemKey } from "@/components/dashboard/WorkspaceSidebar";
import type { ProjectSummary } from "@/lib/projects";
import { OAuthCallbackHandler } from "@/components/auth/OAuthCallbackHandler";

type DashboardShellProps = {
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  initialProjects: ProjectSummary[];
  initialProjectsError?: string;
  activeItem?: SidebarItemKey;
};

const workspaceCopy = {
  primaryActionLabel: "New project",
  blankTitle: "Untitled project",
  emptyTitle: "No projects yet",
  emptyDescription: "Upload a source file or start fresh. Celion shapes it into a structured project.",
  emptyAction: "Create first project",
  loadingLabel: "Loading projects...",
} as const;

const viewCopy: Record<SidebarItemKey, {
  breadcrumbCurrent: string;
  heading: string;
  description: string;
}> = {
  home: {
    breadcrumbCurrent: "Home",
    heading: "Home",
    description: "Start a new ebook or reopen recent work.",
  },
  projects: {
    breadcrumbCurrent: "All projects",
    heading: "Your projects",
    description: "All your projects and works in progress.",
  },
  trash: {
    breadcrumbCurrent: "Trash",
    heading: "Trash",
    description: "Restore projects or delete them permanently.",
  },
  settings: {
    breadcrumbCurrent: "Settings",
    heading: "Settings",
    description: "Manage the basics for your Celion workspace.",
  },
};

export function DashboardShell({
  isSignedIn,
  initialUserName,
  initialUserEmail,
  initialProjects,
  initialProjectsError = "",
  activeItem = "projects",
}: DashboardShellProps) {
  const {
    createAndOpenProject,
    createProjectError,
    creatingProject,
    setCreateProjectError,
  } = useCreateProjectNavigation();
  const dashboardProjects = useDashboardProjects({
    blankTitle: workspaceCopy.blankTitle,
    initialError: initialProjectsError,
    initialProjects,
    resetKey: activeItem,
  });
  const visibleError = dashboardProjects.error || createProjectError;
  const showLoading = dashboardProjects.loading;
  const copy = workspaceCopy;
  const currentView = viewCopy[activeItem];
  const isHomeView = activeItem === "home";
  const isProjectsView = activeItem === "projects";
  const isTrashView = activeItem === "trash";

  async function handleCreateProject() {
    dashboardProjects.clearError();
    setCreateProjectError("");
    await createAndOpenProject();
  }

  return (
    <>
      <OAuthCallbackHandler />
      <WorkspaceLayout
      activeItem={activeItem}
      isSignedIn={isSignedIn}
      initialUserName={initialUserName}
      initialUserEmail={initialUserEmail}
      breadcrumbCurrent={currentView.breadcrumbCurrent}
    >
      {!isHomeView ? (
        <div className="dashboard-head">
          <div>
            <h1 className="dashboard-title">
              {currentView.heading}
            </h1>
            <p className="dashboard-description">
              {currentView.description}
            </p>
          </div>
          {isSignedIn && isProjectsView ? (
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
      ) : null}

      {visibleError && !isHomeView ? (
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

      {!showLoading && isSignedIn ? (
        <>
          {isHomeView ? (
            <DashboardHome
              creatingProject={creatingProject}
              error={visibleError}
              projects={dashboardProjects.projects}
              userName={initialUserName}
              onCreateProject={handleCreateProject}
            />
          ) : null}
          {isProjectsView ? (
            <ProjectList
              projects={dashboardProjects.projects}
              processingProjectId={dashboardProjects.processingProjectId}
              onDeleteProject={dashboardProjects.deleteProject}
            />
          ) : null}
          {isTrashView ? (
            <ProjectList
              mode="trash"
              projects={dashboardProjects.projects}
              processingProjectId={dashboardProjects.processingProjectId}
              onPermanentDeleteProject={dashboardProjects.permanentlyDeleteProject}
              onRestoreProject={dashboardProjects.restoreProject}
            />
          ) : null}
          {activeItem === "settings" ? (
            <SettingsPanel userName={initialUserName} userEmail={initialUserEmail} />
          ) : null}
        </>
      ) : null}

      {!showLoading && isSignedIn && isProjectsView && dashboardProjects.projects.length === 0 ? (
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

      {!showLoading && isSignedIn && isTrashView && dashboardProjects.projects.length === 0 ? (
        <DashboardEmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Projects you move to trash will appear here before permanent deletion."
          maxWidth="320px"
        />
      ) : null}

    </WorkspaceLayout>
    </>
  );
}
