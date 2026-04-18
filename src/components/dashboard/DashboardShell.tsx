"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getGuides } from "@/lib/guide-storage";
import type { GuideRecord } from "@/types/guide";
import { GuideList } from "@/components/dashboard/GuideList";
import { NewGuideButton } from "@/components/dashboard/NewGuideButton";
import { GuideWizard } from "@/components/wizard/GuideWizard";

export function DashboardShell() {
  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setGuides(getGuides());
  }, []);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-line pb-8 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition hover:text-accent"
            >
              <ArrowLeft className="size-4" />
              Back to landing
            </Link>
            <div>
              <h1 className="font-display text-5xl leading-none tracking-[-0.01em] text-text">
                Your guides
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Keep the top-level product small. Start in the wizard. Land in
                the builder. Export or hand off when the HTML preview feels
                right.
              </p>
            </div>
          </div>
          <NewGuideButton onClick={() => setWizardOpen(true)} />
        </div>

        <section className="mt-8">
          <GuideList guides={guides} />
        </section>
      </div>

      {wizardOpen ? (
        <GuideWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setGuides(getGuides());
            setWizardOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
