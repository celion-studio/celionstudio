"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronRight, Clock, FileText, PenLine, Sparkles, Wand2, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { WorkspaceSidebar } from "@/components/dashboard/WorkspaceSidebar";
import type { ProjectRecord } from "@/types/project";

type DashboardShellProps = {
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
};

export function DashboardShell({
  isSignedIn,
  initialUserName,
  initialUserEmail,
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
  const [showCreateChoices, setShowCreateChoices] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const showLoading = loading || (authPending && !hasVerifier);

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
  }, [authPending, hasVerifier, resolvedSignedIn]);

  const printOpened = projects.filter((project) => project.status === "exported").length;
  const inProgress = projects.filter(
    (project) => !["draft", "exported"].includes(project.status),
  ).length;

  async function deleteProject(project: ProjectRecord) {
    const label = project.title || "Untitled Draft";
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
          title: "Untitled Draft",
          sources: [],
          profile: {
            author: "",
            targetAudience: "",
            coreMessage: "",
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
        throw new Error(payload?.message ?? "Could not create a blank draft.");
      }

      setShowCreateChoices(false);
      router.push(`/editor/${payload.project.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a blank draft.");
    } finally {
      setCreatingBlank(false);
    }
  }

  function openCreateChoices() {
    if (!resolvedSignedIn) return;
    setShowCreateChoices(true);
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
        activeItem="workspace"
        isSignedIn={resolvedSignedIn}
        initialUserName={resolvedUserName}
        initialUserEmail={resolvedUserEmail}
        primaryAction={{ href: "/new", label: "New ebook", onClick: openCreateChoices }}
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
              All Drafts
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
                Your drafts
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#71717A" }}>
                All your manuscripts and works in progress.
              </p>
            </div>

            {resolvedSignedIn && projects.length > 0 ? (
              <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
                {[
                  { label: "Total drafts", value: projects.length, icon: FileText },
                  { label: "In progress", value: inProgress, icon: Clock },
                  { label: "Print opened", value: printOpened, icon: BookOpen },
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
                  Loading drafts...
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
                  No drafts yet
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
                  Paste notes, upload a transcript, or start fresh. Celion shapes it into a structured draft.
                </p>
                <button
                  type="button"
                  onClick={openCreateChoices}
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
                  Create first ebook
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
      {showCreateChoices ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create new ebook"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(22, 18, 14, 0.28)",
            padding: "24px",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingBlank) {
              setShowCreateChoices(false);
            }
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#fff",
              border: "1px solid #E7E1D8",
              borderRadius: "10px",
              boxShadow: "0 24px 80px rgba(31, 22, 14, 0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "54px",
                padding: "0 18px 0 20px",
                borderBottom: "1px solid #ECEAE5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 600, color: "#111" }}>
                New ebook
              </span>
              <button
                type="button"
                disabled={creatingBlank}
                aria-label="Close"
                onClick={() => setShowCreateChoices(false)}
                style={{
                  width: "30px",
                  height: "30px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ECEAE5",
                  borderRadius: "6px",
                  background: "#fff",
                  color: "#8E877D",
                  cursor: creatingBlank ? "not-allowed" : "pointer",
                }}
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>

            <div style={{ padding: "18px", display: "grid", gap: "10px" }}>
              <Link
                href={"/new" as Route}
                onClick={() => setShowCreateChoices(false)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 18px",
                  gap: "14px",
                  alignItems: "center",
                  padding: "16px",
                  border: "1px solid #ECEAE5",
                  borderRadius: "8px",
                  textDecorationLine: "none",
                  color: "#111",
                  background: "#fff",
                }}
              >
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#F0EEE9",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wand2 size={16} strokeWidth={1.8} />
                </span>
                <span>
                  <span style={{ display: "block", fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 600 }}>
                    Start with wizard
                  </span>
                  <span style={{ display: "block", marginTop: "3px", fontSize: "12.5px", color: "#71717A" }}>
                    Add source material and generate a draft.
                  </span>
                </span>
                <ChevronRight size={16} color="#B9B2A8" />
              </Link>

              <button
                type="button"
                disabled={creatingBlank}
                onClick={createBlankProject}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 18px",
                  gap: "14px",
                  alignItems: "center",
                  padding: "16px",
                  border: "1px solid #ECEAE5",
                  borderRadius: "8px",
                  textAlign: "left",
                  background: creatingBlank ? "#F7F6F3" : "#fff",
                  color: "#111",
                  cursor: creatingBlank ? "wait" : "pointer",
                }}
              >
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#111",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PenLine size={16} strokeWidth={1.8} />
                </span>
                <span>
                  <span style={{ display: "block", fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 600 }}>
                    Start blank
                  </span>
                  <span style={{ display: "block", marginTop: "3px", fontSize: "12.5px", color: "#71717A" }}>
                    Open the editor with an empty document.
                  </span>
                </span>
                <ChevronRight size={16} color="#B9B2A8" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
