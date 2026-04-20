"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, ChevronRight, Clock, FileText, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { GuideList } from "@/components/dashboard/GuideList";
import { WorkspaceSidebar } from "@/components/dashboard/WorkspaceSidebar";
import type { GuideRecord } from "@/types/guide";

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
  const searchParams = useSearchParams();
  const hasVerifier = searchParams.has("neon_auth_session_verifier");

  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [loading, setLoading] = useState(isSignedIn || hasVerifier);
  const [error, setError] = useState("");

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
    if (!isSignedIn) {
      setGuides([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadGuides() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/guides", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(payload?.message ?? "Could not load your workspace.");
        }

        const payload = (await response.json()) as { guides: GuideRecord[] };

        if (active) {
          setGuides(payload.guides);
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

    void loadGuides();

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const exported = guides.filter((guide) => guide.status === "exported").length;
  const inProgress = guides.filter(
    (guide) => !["draft", "exported"].includes(guide.status),
  ).length;

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
        isSignedIn={isSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        primaryAction={{ href: "/new", label: "New ebook" }}
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

            {isSignedIn && guides.length > 0 ? (
              <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
                {[
                  { label: "Total drafts", value: guides.length, icon: FileText },
                  { label: "In progress", value: inProgress, icon: Clock },
                  { label: "Exported", value: exported, icon: BookOpen },
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

            {loading ? (
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

            {!loading && isSignedIn ? <GuideList guides={guides} /> : null}

            {!loading && !isSignedIn ? (
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
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  Return to sign in
                </Link>
              </div>
            ) : null}

            {!loading && isSignedIn && guides.length === 0 ? (
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
                <Link
                  href={"/new" as Route}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  <FileText size={13} strokeWidth={2.2} />
                  Create first ebook
                </Link>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
