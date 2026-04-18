"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { getGuides } from "@/lib/guide-storage";
import type { GuideRecord } from "@/types/guide";
import { GuideList } from "@/components/dashboard/GuideList";
import { GuideWizard } from "@/components/wizard/GuideWizard";

export function DashboardShell() {
  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setGuides(getGuides());
  }, []);

  const exported = guides.filter((g) => g.status === "exported").length;

  return (
    <main className="min-h-screen bg-[#FAF9F5]">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="border-b border-[#E8E4DB] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1F1F1F]">
                <span className="font-mono text-[10px] font-bold text-white">C</span>
              </div>
              <span className="text-[14px] font-medium text-[#1F1F1F]">Celion</span>
            </Link>
            <span className="text-[#E8E4DB]">/</span>
            <span className="text-[13px] text-[#71717a]">Ebooks</span>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F1F1F] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-80"
          >
            <Plus className="size-3.5" />
            New ebook
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* ── Page title + stats ──────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">
            Your ebooks
          </h1>
          <p className="mt-1.5 text-[14px] text-[#71717a]">
            Paste your knowledge, export an ebook. It&apos;s that direct.
          </p>

          {guides.length > 0 && (
            <div className="mt-6 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">{guides.length}</span>
                <span className="text-[13px] text-[#71717a]">ebooks</span>
              </div>
              <div className="h-4 w-px bg-[#E8E4DB]" />
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">{exported}</span>
                <span className="text-[13px] text-[#71717a]">exported</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Guide list ──────────────────────────────────── */}
        <GuideList guides={guides} />

        {/* ── Empty state ─────────────────────────────────── */}
        {guides.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E8E4DB] bg-white px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F2EC]">
              <BookOpen className="size-5 text-[#7A7670]" />
            </div>
            <p className="text-[15px] font-medium text-[#1F1F1F]">No ebooks yet</p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#71717a]">
              Paste your notes or upload a file. Celion turns what you know into a structured, sellable ebook.
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#1F1F1F] px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-80"
            >
              <Plus className="size-3.5" />
              Create your first ebook
            </button>
          </div>
        )}
      </div>

      {wizardOpen && (
        <GuideWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setGuides(getGuides());
            setWizardOpen(false);
          }}
        />
      )}
    </main>
  );
}
