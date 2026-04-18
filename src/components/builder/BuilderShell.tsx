"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SourcePanel } from "@/components/builder/SourcePanel";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { ActionPanel } from "@/components/builder/ActionPanel";
import type { GuideRecord } from "@/types/guide";

function readSectionIds(html: string) {
  return Array.from(html.matchAll(/data-section="([^"]+)"/g)).map(
    (match) => match[1] ?? "",
  );
}

export function BuilderShell({ guideId }: { guideId: string }) {
  const [guide, setGuide] = useState<GuideRecord | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGuide() {
      setLoading(true);
      setFeedback("");

      try {
        const response = await fetch(`/api/guides/${guideId}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { guide?: GuideRecord; message?: string }
          | null;

        if (!response.ok || !payload?.guide) {
          throw new Error(payload?.message ?? "Could not load this draft.");
        }

        if (active) {
          setGuide(payload.guide);
        }
      } catch (caught) {
        if (active) {
          setGuide(null);
          setFeedback(
            caught instanceof Error
              ? caught.message
              : "Could not load this draft.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadGuide();

    return () => {
      active = false;
    };
  }, [guideId]);

  const sectionIds = useMemo(
    () => (guide?.html ? readSectionIds(guide.html) : []),
    [guide?.html],
  );

  async function applyMutation(
    body:
      | { action: "generate" | "regenerate" | "mark-exported" }
      | { action: "revise"; revisionPrompt: string }
      | {
          action: "regenerate-section";
          targetSection: string;
          revisionPrompt?: string;
        },
    successMessage: string,
  ) {
    const response = await fetch(`/api/guides/${guideId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as
      | { guide?: GuideRecord; message?: string }
      | null;

    if (!response.ok || !payload?.guide) {
      throw new Error(payload?.message ?? "Could not update this draft.");
    }

    setGuide(payload.guide);
    setFeedback(successMessage);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-[32px] border border-line bg-white/75 p-8 text-center shadow-float">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Loading
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-text">
            Pulling the latest draft...
          </h1>
        </div>
      </main>
    );
  }

  if (!guide) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-[32px] border border-line bg-white/75 p-8 text-center shadow-float">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Draft unavailable
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-text">
            This record could not be loaded.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            {feedback ||
              "Open the dashboard, sign in, and create a new draft from the account-backed workspace."}
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
          onGenerateFirstDraft={async () => {
            try {
              await applyMutation(
                { action: "generate" },
                "First HTML draft generated and saved to the database.",
              );
            } catch (caught) {
              setFeedback(
                caught instanceof Error
                  ? caught.message
                  : "Could not generate the first draft.",
              );
            }
          }}
          onRegenerateDraft={async () => {
            try {
              await applyMutation(
                { action: "regenerate" },
                "Draft regenerated from the stored source bundle.",
              );
            } catch (caught) {
              setFeedback(
                caught instanceof Error
                  ? caught.message
                  : "Could not regenerate the draft.",
              );
            }
          }}
          onReviseDraft={async () => {
            if (!guide.html) {
              setFeedback("Generate a first draft before asking for revisions.");
              return;
            }

            try {
              await applyMutation(
                { action: "revise", revisionPrompt },
                "Whole-draft revision saved.",
              );
            } catch (caught) {
              setFeedback(
                caught instanceof Error
                  ? caught.message
                  : "Could not revise the draft.",
              );
            }
          }}
          onRegenerateSection={async (sectionId) => {
            if (!guide.html) {
              setFeedback("Generate a first draft before regenerating a section.");
              return;
            }

            try {
              await applyMutation(
                {
                  action: "regenerate-section",
                  targetSection: sectionId,
                  revisionPrompt:
                    revisionPrompt ||
                    `Refresh ${sectionId} for stronger clarity.`,
                },
                `${sectionId} was regenerated and stored as a new revision.`,
              );
            } catch (caught) {
              setFeedback(
                caught instanceof Error
                  ? caught.message
                  : "Could not regenerate that section.",
              );
            }
          }}
          onExportPdf={async () => {
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

            try {
              await applyMutation(
                { action: "mark-exported" },
                "Browser print opened. Save it as PDF from the print dialog.",
              );
            } catch (caught) {
              setFeedback(
                caught instanceof Error
                  ? caught.message
                  : "Print opened, but export status could not be saved.",
              );
            }
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
