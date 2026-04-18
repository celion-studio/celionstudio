"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { withGeneratedHtml } from "@/lib/celion-model";
import { getGuideById, saveGuide } from "@/lib/guide-storage";
import type { GuideRecord } from "@/types/guide";
import { SourcePanel } from "@/components/builder/SourcePanel";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { ActionPanel } from "@/components/builder/ActionPanel";

function readSectionIds(html: string) {
  return Array.from(html.matchAll(/data-section="([^"]+)"/g)).map(
    (match) => match[1] ?? "",
  );
}

export function BuilderShell({ guideId }: { guideId: string }) {
  const [guide, setGuide] = useState<GuideRecord | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setGuide(getGuideById(guideId));
  }, [guideId]);

  const sectionIds = useMemo(
    () => (guide?.html ? readSectionIds(guide.html) : []),
    [guide?.html],
  );

  const updateGuide = (nextGuide: GuideRecord, message: string) => {
    saveGuide(nextGuide);
    setGuide(nextGuide);
    setFeedback(message);
  };

  if (!guide) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-[32px] border border-line bg-white/75 p-8 text-center shadow-float">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Ebook not found
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-text">
            This draft is not in local storage.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Open the dashboard, create an ebook from the wizard, and the builder
            will have a local record to work with.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-medium text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Builder
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-[-0.03em] text-text">
            {guide.title}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-text"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </div>

      <section className="grid min-h-[calc(100vh-97px)] grid-cols-1 xl:grid-cols-[300px_1fr_340px]">
        <SourcePanel guide={guide} />
        <PreviewPanel html={guide.html} title={guide.title} />
        <ActionPanel
          hasHtml={Boolean(guide.html)}
          sectionIds={sectionIds}
          revisionPrompt={revisionPrompt}
          feedback={feedback}
          onRevisionPromptChange={setRevisionPrompt}
          onGenerateFirstDraft={() => {
            updateGuide(
              withGeneratedHtml(guide),
              "First HTML draft generated locally for the current shell.",
            );
          }}
          onRegenerateDraft={() => {
            updateGuide(
              withGeneratedHtml(guide),
              "Draft regenerated from the current source bundle.",
            );
          }}
          onReviseDraft={() => {
            if (!guide.html) {
              setFeedback("Generate a first draft before asking for revisions.");
              return;
            }

            updateGuide(
              withGeneratedHtml(guide, { revisionPrompt }),
              "Whole-draft revision applied locally. The real AI revision route comes next.",
            );
          }}
          onRegenerateSection={(sectionId) => {
            if (!guide.html) {
              setFeedback("Generate a first draft before regenerating a section.");
              return;
            }

            updateGuide(
              withGeneratedHtml(guide, {
                revisionPrompt:
                  revisionPrompt || `Refresh ${sectionId} for stronger clarity.`,
                targetSection: sectionId,
              }),
              `${sectionId} was regenerated with the current local shell logic.`,
            );
          }}
          onExportPdf={() => {
            if (!guide.html) {
              setFeedback("PDF export is unavailable before the first draft exists.");
              return;
            }

            const popup = window.open("", "_blank", "noopener,noreferrer");
            if (!popup) {
              setFeedback("The print window was blocked by the browser.");
              return;
            }

            popup.document.open();
            popup.document.write(guide.html);
            popup.document.close();
            popup.focus();
            popup.print();
            updateGuide(
              { ...guide, status: "exported", updatedAt: new Date().toISOString() },
              "Browser print opened. Save it as PDF from the print dialog.",
            );
          }}
          onFigmaHandoff={async () => {
            if (!guide.html) {
              setFeedback("Copy-to-Figma is unavailable before the first draft exists.");
              return;
            }

            await navigator.clipboard.writeText(guide.html);
            setFeedback(
              "HTML copied. You can paste it into your Figma handoff flow from here.",
            );
          }}
        />
      </section>
    </main>
  );
}
