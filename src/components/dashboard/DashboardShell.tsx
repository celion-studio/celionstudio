"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Plus,
  LayoutDashboard,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
  Clock,
  FileText,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { GuideList } from "@/components/dashboard/GuideList";
import type { GuideRecord } from "@/types/guide";

type DashboardShellProps = {
  isSignedIn: boolean;
  sessionLabel: string | null;
};

const NAV_ITEMS: Array<{ label: string; icon: typeof LayoutDashboard; href: string; active?: boolean }> = [
  { label: "Workspace", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "New ebook", icon: Plus, href: "/new" },
  { label: "Settings", icon: Settings, href: "/dashboard" },
];

export function DashboardShell({ isSignedIn, sessionLabel }: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasVerifier = searchParams.has("neon_auth_session_verifier");

  const [guides, setGuides] = useState<GuideRecord[]>([]);
  // Show loading until verifier is resolved OR while fetching guides
  const [loading, setLoading] = useState(isSignedIn || hasVerifier);
  const [error, setError] = useState("");
  const { data: session } = authClient.useSession();
  // ── 1. Finalize OAuth session when the verifier param is present ──
  useEffect(() => {
    if (!hasVerifier) return;

    let active = true;
    async function finalizeSession() {
      try {
        const result = await authClient.getSession();
        if (!result?.error && active) {
          // Strip the verifier param and reload so the server can see the cookie
          const next = new URLSearchParams(searchParams.toString());
          next.delete("neon_auth_session_verifier");
          const path = next.size > 0 ? `/dashboard?${next.toString()}` : "/dashboard";
          window.location.replace(path);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    void finalizeSession();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Load guides once signed in ──
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
        const response = await fetch("/api/guides", { method: "GET", cache: "no-store" });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? "Could not load your workspace.");
        }

        const payload = (await response.json()) as { guides: GuideRecord[] };
        if (active) setGuides(payload.guides);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not load your workspace.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGuides();
    return () => { active = false; };
  }, [isSignedIn]);

  const exported = guides.filter((g) => g.status === "exported").length;
  const inProgress = guides.filter((g) => !["draft", "exported"].includes(g.status)).length;
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() ?? sessionLabel?.charAt(0).toUpperCase() ?? "U";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F6F3", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      {/* ─── Sidebar ─── */}
      <aside style={{
        width: "220px",
        flexShrink: 0,
        background: "#FFFFFF",
        borderRight: "1px solid #ECEAE5",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        overflow: "hidden",
      }}>
        {/* Brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #ECEAE5" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{
              width: "30px", height: "30px",
              background: "#111",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "15px", fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>celion</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href as Route}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 10px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "13.5px",
                fontWeight: item.active ? 500 : 400,
                color: item.active ? "#111" : "#71717A",
                background: item.active ? "#F0EEE9" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* New Draft CTA */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #ECEAE5" }}>
          <button
            onClick={() => router.push("/new" as Route)}
            disabled={!isSignedIn}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "9px 0",
              background: "#111", color: "#fff",
              border: "none", borderRadius: "8px",
              fontSize: "13px", fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
              cursor: isSignedIn ? "pointer" : "not-allowed",
              opacity: isSignedIn ? 1 : 0.4,
              transition: "opacity 0.15s ease",
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            New ebook
          </button>
        </div>

        {/* User */}
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #ECEAE5", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            background: "#111", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 600, color: "#fff", flexShrink: 0,
          }}>{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {session?.user?.name ?? sessionLabel ?? "Guest"}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#A1A1AA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => authClient.signOut().then(() => window.location.replace("/"))}
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#A1A1AA", display: "flex", alignItems: "center" }}
          >
            <LogOut size={13} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          height: "57px",
          background: "#fff",
          borderBottom: "1px solid #ECEAE5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#A1A1AA" }}>Workspace</span>
            <ChevronRight size={12} color="#D4D2CC" />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#111" }}>All Drafts</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "#F7F6F3", borderRadius: "6px",
              padding: "5px 10px",
              fontSize: "12px", color: "#71717A",
              border: "1px solid #ECEAE5",
            }}>
              <Sparkles size={11} strokeWidth={1.8} />
              <span style={{ fontFamily: "'Geist', sans-serif" }}>AI ready</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px 32px 48px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{
              margin: 0, fontFamily: "'Geist', sans-serif",
              fontSize: "22px", fontWeight: 600, letterSpacing: "-0.03em", color: "#111",
            }}>
              Your drafts
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#71717A" }}>
              All your manuscripts and works in progress.
            </p>
          </div>

          {/* Stats row */}
          {isSignedIn && guides.length > 0 && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
              {[
                { label: "Total drafts", value: guides.length, icon: FileText },
                { label: "In progress", value: inProgress, icon: Clock },
                { label: "Exported", value: exported, icon: BookOpen },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{
                  flex: 1, background: "#fff", border: "1px solid #ECEAE5",
                  borderRadius: "10px", padding: "16px 18px",
                  display: "flex", alignItems: "center", gap: "14px",
                }}>
                  <div style={{
                    width: "34px", height: "34px", background: "#F0EEE9",
                    borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={15} color="#555" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "22px", fontFamily: "'Geist', sans-serif", fontWeight: 600, letterSpacing: "-0.03em", color: "#111" }}>{value}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#A1A1AA" }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: "20px", padding: "12px 16px", background: "#FFF5F2", borderRadius: "8px", border: "1px solid #FEDDCF" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#9b4c19" }}>{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#A1A1AA", fontFamily: "'Geist', sans-serif" }}>
                Loading drafts...
              </p>
            </div>
          )}

          {/* Guide list */}
          {!loading && isSignedIn && <GuideList guides={guides} />}

          {/* Not signed in */}
          {!loading && !isSignedIn && (
            <div style={{
              marginTop: "24px", padding: "60px 32px", textAlign: "center",
              background: "#fff", border: "1px dashed #DEDAD3", borderRadius: "12px",
            }}>
              <div style={{ width: "44px", height: "44px", background: "#F0EEE9", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <BookOpen size={18} color="#555" strokeWidth={1.8} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "'Geist', sans-serif", fontSize: "16px", fontWeight: 600, color: "#111" }}>Sign in to continue</h3>
              <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#71717A", maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
                Your workspace is account-backed. Sign in to access your manuscripts.
              </p>
              <Link
                href="/"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 18px", background: "#111", color: "#fff",
                  borderRadius: "8px", textDecoration: "none",
                  fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif",
                }}
              >
                Return to sign in
              </Link>
            </div>
          )}

          {/* Empty state */}
          {!loading && isSignedIn && guides.length === 0 && (
            <div style={{
              marginTop: "24px", padding: "60px 32px", textAlign: "center",
              background: "#fff", border: "1px dashed #DEDAD3", borderRadius: "12px",
            }}>
              <div style={{ width: "44px", height: "44px", background: "#F0EEE9", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FileText size={18} color="#555" strokeWidth={1.8} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "'Geist', sans-serif", fontSize: "16px", fontWeight: 600, color: "#111" }}>No drafts yet</h3>
              <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#71717A", maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                Paste notes, upload a transcript, or start fresh. Celion shapes it into a structured draft.
              </p>
              <Link
                href={"/new" as Route}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 18px", background: "#111", color: "#fff",
                  borderRadius: "8px", textDecoration: "none",
                  fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif",
                }}
              >
                <Plus size={13} strokeWidth={2.2} />
                Create first ebook
              </Link>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
