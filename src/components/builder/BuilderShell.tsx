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
      <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F7F6F3", padding: "24px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#A1A1AA", fontFamily: "'Geist', sans-serif" }}>Loading draft…</p>
        </div>
      </main>
    );
  }

  if (!guide) {
    return (
      <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F7F6F3", padding: "24px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: "480px", textAlign: "center", background: "#fff", border: "1px solid #ECEAE5", borderRadius: "12px", padding: "40px 32px" }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", color: "#A1A1AA" }}>Draft unavailable</p>
          <h1 style={{ margin: "12px 0 0", fontFamily: "'Geist', sans-serif", fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", color: "#111" }}>Could not load this draft.</h1>
          <p style={{ margin: "12px 0 0", fontSize: "13.5px", lineHeight: 1.6, color: "#71717A" }}>
            {feedback || "Sign in and try again from your dashboard."}
          </p>
          <Link
            href="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "20px", padding: "8px 18px", background: "#111", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F7F6F3", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Builder top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ECEAE5", background: "#fff", padding: "0 24px", height: "57px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none", color: "#71717A", fontSize: "13px" }}>
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <span style={{ color: "#D4D2CC", fontSize: "13px" }}>/</span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111", fontFamily: "'Geist', sans-serif", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guide.title}</span>
        </div>
      </div>

      <section className="grid min-h-[calc(100vh-57px)] grid-cols-1 xl:grid-cols-[300px_1fr_340px]">
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
