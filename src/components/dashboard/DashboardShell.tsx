"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronRight, Clock, FileText, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { WorkspaceSidebar, type SidebarItemKey } from "@/components/dashboard/WorkspaceSidebar";
import type { ProjectKind, ProjectRecord } from "@/types/project";

type DashboardShellProps = {
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  activeItem?: SidebarItemKey;
  surface?: "workspace" | "documents";
};

const surfaceCopy = {
  workspace: {
    breadcrumbCurrent: "All Drafts",
    heading: "Your drafts",
    description: "All your manuscripts and works in progress.",
    primaryActionLabel: "New ebook",
    blankTitle: "Untitled Draft",
    emptyTitle: "No drafts yet",
    emptyDescription: "Paste notes, upload a transcript, or start fresh. Celion shapes it into a structured draft.",
    emptyAction: "Create first ebook",
    loadingLabel: "Loading drafts...",
    statTotal: "Total drafts",
    statActive: "In progress",
    statExported: "Print opened",
  },
  documents: {
    breadcrumbCurrent: "Documents",
    heading: "Document editor",
    description: "Standalone writing and formatting drafts live here.",
    primaryActionLabel: "New document",
    blankTitle: "Untitled Document",
    emptyTitle: "No documents yet",
    emptyDescription: "Create a blank document when you want a direct writing and formatting workspace.",
    emptyAction: "Create document",
    loadingLabel: "Loading documents...",
    statTotal: "Total documents",
    statActive: "Editing",
    statExported: "Exported",
  },
} as const;

const surfaceProjectKind: Record<NonNullable<DashboardShellProps["surface"]>, ProjectKind> = {
  workspace: "product",
  documents: "document",
};

export function DashboardShell({
  isSignedIn,
  initialUserName,
  initialUserEmail,
  activeItem = "workspace",
  surface = "workspace",
}: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasVerifier = searchParams.has("neon_auth_session_verifier");
  const { data: clientSession, isPending: authPending } = authClient.useSession();
  const resolvedSignedIn = authPending
    ? isSignedIn
    : Boolean(clientSession?.user);
  const resolvedUserName = authPending
    ? initialUserName
    : clientSession?.user?.name ?? null;
  const resolvedUserEmail = authPending
    ? initialUserEmail
    : clientSession?.user?.email ?? null;

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(isSignedIn || hasVerifier);
  const [error, setError] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState("");
  const [creatingBlank, setCreatingBlank] = useState(false);
  const showLoading = loading || (authPending && !hasVerifier);
  const copy = surfaceCopy[surface];
  const projectKind = surfaceProjectKind[surface];

  async function fetchProjects() {
    const response = await fetch(`/api/projects?kind=${projectKind}`, {
      method: "GET",
      cache: "no-store",
    });

    if (response.status !== 401) {
      return response;
    }

    await authClient.getSession();

    return fetch(`/api/projects?kind=${projectKind}`, {
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
    if (hasVerifier || authPending) {
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
  }, [authPending, hasVerifier, projectKind, resolvedSignedIn]);

  const printOpened = projects.filter((project) => project.status === "exported").length;
  const inProgress = projects.filter(
    (project) => !["draft", "exported"].includes(project.status),
  ).length;

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

  async function createBlankProject() {
    if (creatingBlank) return;

    setCreatingBlank(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          title: copy.blankTitle,
          kind: projectKind,
          sources: [],
          profile: {
            author: "",
            targetAudience: "",
            purpose: "",
            designMode: "text",
            pageFormat: "ebook",
            customPageSize: { widthMm: 152, heightMm: 229 },
            tone: "",
            plan: null,
            document: {
              type: "tiptap-book",
              version: 1,
              pages: [{ id: "page-1", doc: { type: "doc", content: [{ type: "paragraph" }] } }],
            },
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { project?: ProjectRecord; message?: string }
        | null;
      if (!response.ok || !payload?.project) {
        throw new Error(
          payload?.message ??
            `Could not create ${surface === "documents" ? "a blank document" : "a draft"}.`,
        );
      }

      router.push(`/editor/${payload.project.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not create ${surface === "documents" ? "a blank document" : "a draft"}.`,
      );
    } finally {
      setCreatingBlank(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#F7F6F3",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      <WorkspaceSidebar
        activeItem={activeItem}
        isSignedIn={resolvedSignedIn}
        initialUserName={resolvedUserName}
        initialUserEmail={resolvedUserEmail}
        primaryAction={{
          href: "/new",
          label: copy.primaryActionLabel,
          onClick: surface === "documents" ? createBlankProject : undefined,
        }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            height: "57px",
            background: "#fff",
            borderBottom: "1px solid #ECEAE5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#A1A1AA" }}>Workspace</span>
            <ChevronRight size={12} color="#D4D2CC" />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#111" }}>
              {copy.breadcrumbCurrent}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#F7F6F3",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "12px",
                color: "#71717A",
                border: "1px solid #ECEAE5",
              }}
            >
              <Sparkles size={11} strokeWidth={1.8} />
              <span style={{ fontFamily: "'Geist', sans-serif" }}>AI ready</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: "32px 32px 48px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ marginBottom: "28px" }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "#111",
                }}
              >
                {copy.heading}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#71717A" }}>
                {copy.description}
              </p>
            </div>

            {resolvedSignedIn && projects.length > 0 ? (
              <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
                {[
                  { label: copy.statTotal, value: projects.length, icon: FileText },
                  { label: copy.statActive, value: inProgress, icon: Clock },
                  { label: copy.statExported, value: printOpened, icon: BookOpen },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    style={{
                      flex: 1,
                      background: "#fff",
                      border: "1px solid #ECEAE5",
                      borderRadius: "10px",
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        background: "#F0EEE9",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={15} color="#555" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "22px",
                          fontFamily: "'Geist', sans-serif",
                          fontWeight: 600,
                          letterSpacing: "-0.03em",
                          color: "#111",
                        }}
                      >
                        {value}
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#A1A1AA" }}>
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "12px 16px",
                  background: "#FFF5F2",
                  borderRadius: "8px",
                  border: "1px solid #FEDDCF",
                }}
              >
                <p style={{ margin: 0, fontSize: "13px", color: "#9b4c19" }}>{error}</p>
              </div>
            ) : null}

            {showLoading ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#A1A1AA",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  {copy.loadingLabel}
                </p>
              </div>
            ) : null}

            {!showLoading && resolvedSignedIn ? (
              <ProjectList
                projects={projects}
                surface={surface}
                deletingProjectId={deletingProjectId}
                onDeleteProject={deleteProject}
              />
            ) : null}

            {!showLoading && !resolvedSignedIn ? (
              <div
                style={{
                  marginTop: "24px",
                  padding: "60px 32px",
                  textAlign: "center",
                  background: "#fff",
                  border: "1px dashed #DEDAD3",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#F0EEE9",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <BookOpen size={18} color="#555" strokeWidth={1.8} />
                </div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "'Geist', sans-serif",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  Sign in to continue
                </h3>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "13.5px",
                    color: "#71717A",
                    maxWidth: "320px",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  Your workspace is account-backed. Sign in to access your manuscripts.
                </p>
                <Link
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecorationLine: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  Return to sign in
                </Link>
              </div>
            ) : null}

            {!showLoading && resolvedSignedIn && projects.length === 0 ? (
              <div
                style={{
                  marginTop: "24px",
                  padding: "60px 32px",
                  textAlign: "center",
                  background: "#fff",
                  border: "1px dashed #DEDAD3",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#F0EEE9",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <FileText size={18} color="#555" strokeWidth={1.8} />
                </div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "'Geist', sans-serif",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  {copy.emptyTitle}
                </h3>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "13.5px",
                    color: "#71717A",
                    maxWidth: "300px",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {copy.emptyDescription}
                </p>
                <button
                  type="button"
                  onClick={surface === "documents" ? createBlankProject : () => router.push("/new")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecorationLine: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily: "'Geist', sans-serif",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <FileText size={13} strokeWidth={2.2} />
                  {copy.emptyAction}
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
