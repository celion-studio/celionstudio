"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { GuideList } from "@/components/dashboard/GuideList";
import { GuideWizard } from "@/components/wizard/GuideWizard";
import type { GuideRecord } from "@/types/guide";

type DashboardShellProps = {
  isSignedIn: boolean;
  sessionLabel: string | null;
};

export function DashboardShell({
  isSignedIn,
  sessionLabel,
}: DashboardShellProps) {
  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(isSignedIn);
  const [error, setError] = useState("");

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

  return (
    <main className="min-h-screen bg-[#FAF9F5]">
      <header className="border-b border-[#E8E4DB] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1F1F1F]">
                <span className="font-mono text-[10px] font-bold text-white">
                  C
                </span>
              </div>
              <span className="text-[14px] font-medium text-[#1F1F1F]">
                Celion
              </span>
            </Link>
            <span className="text-[#E8E4DB]">/</span>
            <span className="text-[13px] text-[#71717a]">Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden text-[12px] text-[#71717a] sm:block">
              {sessionLabel ?? "Sign in to start saving work"}
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              disabled={!isSignedIn}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F1F1F] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              New draft
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">
            Your workspace
          </h1>
          <p className="mt-1.5 text-[14px] text-[#71717a]">
            Source material, HTML drafts, and exports now live behind your account.
          </p>

          {isSignedIn && guides.length > 0 ? (
            <div className="mt-6 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">
                  {guides.length}
                </span>
                <span className="text-[13px] text-[#71717a]">drafts</span>
              </div>
              <div className="h-4 w-px bg-[#E8E4DB]" />
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">
                  {exported}
                </span>
                <span className="text-[13px] text-[#71717a]">exported</span>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mb-4 rounded-2xl bg-[#fff1e6] px-4 py-3 text-sm text-[#9b4c19]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[#E8E4DB] bg-white px-8 py-14 text-center">
            <p className="text-[14px] text-[#71717a]">Loading your drafts...</p>
          </div>
        ) : null}

        {!loading && isSignedIn ? <GuideList guides={guides} /> : null}

        {!loading && !isSignedIn ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E8E4DB] bg-white px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F2EC]">
              <BookOpen className="size-5 text-[#7A7670]" />
            </div>
            <p className="text-[15px] font-medium text-[#1F1F1F]">
              Sign in to start
            </p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#71717a]">
              Local browser storage has been removed. Sign in first, then create
              and edit drafts from your account-backed workspace.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#1F1F1F] px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-80"
            >
              Back to sign in
            </Link>
          </div>
        ) : null}

        {!loading && isSignedIn && guides.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E8E4DB] bg-white px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F2EC]">
              <BookOpen className="size-5 text-[#7A7670]" />
            </div>
            <p className="text-[15px] font-medium text-[#1F1F1F]">
              No drafts yet
            </p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#71717a]">
              Paste notes or upload a file. Celion will save the source bundle and
              HTML revisions to your account.
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#1F1F1F] px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-80"
            >
              <Plus className="size-3.5" />
              Create your first draft
            </button>
          </div>
        ) : null}
      </div>

      {wizardOpen ? (
        <GuideWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(guide) => {
            setGuides((current) => [guide, ...current.filter((item) => item.id !== guide.id)]);
            setWizardOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
