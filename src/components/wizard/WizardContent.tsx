"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { z } from "zod";
import { useProjectWizardStore } from "@/store/useProjectWizardStore";
import type { WizardStep } from "@/store/useProjectWizardStore";
import { BasicsStep } from "@/components/wizard/BasicsStep";
import { StyleStep } from "@/components/wizard/StyleStep";
import { FormatStepEbook } from "@/components/wizard/FormatStepEbook";
import { SourceStepEbook } from "@/components/wizard/SourceStepEbook";
import { OutlineStep } from "@/components/wizard/OutlineStep";
import { GenerateStepEbook } from "@/components/wizard/GenerateStepEbook";
import type { EbookOutline } from "@/types/project";

const TOTAL_STEPS = 6;

const STEP_LABELS = ["Basics", "Style", "Format", "Source", "Outline", "Generate"] as const;
const STEP_TITLES = [
  "Set up your ebook",
  "Choose a style",
  "Page format",
  "Add your source",
  "Review the outline",
  "Generate your ebook",
] as const;
const STEP_DESCRIPTIONS = [
  "Title, author, target reader, and core message.",
  "Pick the visual style for your ebook design.",
  "Choose page count and accent color.",
  "Paste notes or content for the AI to use.",
  "Review the AI-generated chapter structure.",
  "Celion will generate a full HTML/CSS ebook.",
] as const;

const basicsSchema = z.object({
  title: z.string().trim().min(1, "Add a title."),
  targetAudience: z.string().trim().min(1, "Add the target reader."),
  coreMessage: z.string().trim().min(1, "Add the core message."),
});

function getStepIssue(step: WizardStep, state: ReturnType<typeof useProjectWizardStore.getState>): string | null {
  if (step === 1) {
    const result = basicsSchema.safeParse({ title: state.title, targetAudience: state.targetAudience, coreMessage: state.coreMessage });
    return result.success ? null : (result.error.issues[0]?.message ?? "Complete this step.");
  }
  if (step === 2) {
    if (!state.ebookStyle) return "Choose a style to continue.";
    return null;
  }
  return null;
}

export function WizardContent({ isSignedIn = true }: { isSignedIn?: boolean }) {
  const router = useRouter();
  const store = useProjectWizardStore();
  const {
    step, title, author, targetAudience, coreMessage,
    ebookStyle, pageCount, accentColor, sourceText,
    outline, outlineLoading, generating, error,
    setStep, setField, setEbookStyle, setPageCount, setAccentColor,
    setOutline, setOutlineLoading, setGenerating, setError, reset,
  } = store;

  const [submitting, setSubmitting] = useState(false);

  const currentIssue = getStepIssue(step, store);
  const busy = submitting || generating || outlineLoading;
  const canAdvance = currentIssue == null && !busy;
  const currentStepIndex = step - 1;

  const handlePrevious = () => {
    if (step === 1 || busy) return;
    setStep((step - 1) as WizardStep);
  };

  const generateOutline = async (): Promise<EbookOutline | null> => {
    setOutlineLoading(true);
    try {
      const res = await fetch("/api/ebook/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, coreMessage, targetAudience, sourceText, pageCount, ebookStyle }),
      });
      const data = await res.json() as { outline?: EbookOutline; message?: string };
      if (!res.ok || !data.outline) throw new Error(data.message ?? "Failed to generate outline.");
      setOutline(data.outline);
      return data.outline;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate outline.");
      return null;
    } finally {
      setOutlineLoading(false);
    }
  };

  const handleNext = async () => {
    if (busy || currentIssue) return;

    // Step 4 → 5: auto-generate outline
    if (step === 4) {
      setStep(5);
      const result = await generateOutline();
      if (!result) return;
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((step + 1) as WizardStep);
      return;
    }

    // Step 6: generate ebook
    if (!isSignedIn) {
      setError("Sign in before generating so Celion can save your ebook.");
      return;
    }
    if (!outline) {
      setError("Generate an outline first.");
      return;
    }

    setSubmitting(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/ebook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, coreMessage, targetAudience, sourceText, pageCount, ebookStyle, accentColor, outline }),
      });
      const data = await res.json() as { projectId?: string; message?: string };
      if (!res.ok || !data.projectId) throw new Error(data.message ?? "Could not generate ebook.");
      reset();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/builder/${data.projectId}` as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  const ctaLabel = generating || submitting
    ? "Generating..."
    : outlineLoading
      ? "Generating outline..."
      : step === TOTAL_STEPS
        ? "Generate ebook"
        : step === 4
          ? "Generate outline"
          : "Continue";

  const ctaIcon = step === TOTAL_STEPS ? <Zap size={13} /> : <ArrowRight size={12} />;

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: "11px", fontFamily: "'Geist', sans-serif", fontWeight: 500, letterSpacing: "0.1em", color: "#b8b4aa" }}>
            {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-4">
            {STEP_LABELS.map((label, index) => {
              const isActive = step === index + 1;
              const isDone = step > index + 1;
              return (
                <span
                  key={label}
                  style={{
                    fontSize: "11px",
                    fontFamily: "'Geist', sans-serif",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    color: isActive ? "#1f1f1f" : isDone ? "#c8c4bb" : "#d8d4cc",
                    textDecorationLine: isActive ? "underline" : "none",
                    textUnderlineOffset: "4px",
                    textDecorationColor: "#1a1714",
                    textDecorationThickness: "1.5px",
                    transition: "color 0.2s ease",
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        <h1 style={{ margin: "18px 0 0", fontFamily: "'Geist', sans-serif", fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.08, letterSpacing: "-0.04em", fontWeight: 500, color: "#1a1714" }}>
          {STEP_TITLES[currentStepIndex]}
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: "13.5px", lineHeight: 1.55, color: "#8a867e", fontFamily: "'Geist', sans-serif" }}>
          {STEP_DESCRIPTIONS[currentStepIndex]}
        </p>

        <div className="mt-6 flex gap-1">
          {STEP_LABELS.map((_, index) => (
            <div
              key={index}
              style={{
                height: "2px",
                flex: 1,
                borderRadius: "2px",
                background: step > index ? "#17191d" : "#e1e4e8",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>
      </section>

      <section style={{ borderRadius: "10px", border: "1px solid #e1e4e8", background: "linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)", boxShadow: "0 4px 32px rgba(24,27,31,0.05), 0 1px 2px rgba(0,0,0,0.03)", overflow: "hidden" }}>
        <div key={step} className="step-in px-6 pt-7 pb-2 md:px-8 md:pt-8">
          {step === 1 && (
            <BasicsStep
              title={title}
              author={author}
              targetAudience={targetAudience}
              coreMessage={coreMessage}
              tone="preserve"
              onFieldChange={setField}
              onToneChange={() => {}}
            />
          )}
          {step === 2 && (
            <StyleStep ebookStyle={ebookStyle} onStyleChange={setEbookStyle} />
          )}
          {step === 3 && (
            <FormatStepEbook
              pageCount={pageCount}
              accentColor={accentColor}
              onPageCountChange={setPageCount}
              onAccentColorChange={setAccentColor}
            />
          )}
          {step === 4 && (
            <SourceStepEbook sourceText={sourceText} onSourceTextChange={(v) => setField("sourceText", v)} />
          )}
          {step === 5 && (
            <OutlineStep outline={outline} loading={outlineLoading} />
          )}
          {step === 6 && (
            <GenerateStepEbook
              title={title}
              author={author}
              ebookStyle={ebookStyle}
              pageCount={pageCount}
              accentColor={accentColor}
              generating={generating}
            />
          )}
        </div>

        <div style={{ margin: "28px 0 0", padding: "20px 32px 24px", borderTop: "1px solid #eef0f2", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            {error ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#5f6670", fontFamily: "'Geist', sans-serif", background: "#f7f6f3", border: "1px solid #e5e2dc", borderRadius: "6px", padding: "5px 10px" }}>
                {error}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={handlePrevious}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#e1e4e8] bg-white px-4 py-2.5 text-[13px] font-medium text-[#4b515a] transition-all duration-150 hover:border-[#c5cad1] hover:text-[#17191d] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                <ArrowLeft size={12} />
                Previous
              </button>
            )}

            <button
              type="button"
              disabled={!canAdvance}
              onClick={handleNext}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-150 ${canAdvance ? "cursor-pointer bg-[#1a1714] hover:-translate-y-px hover:bg-[#2d2925] hover:shadow-[0_4px_16px_rgba(0,0,0,0.16)]" : "cursor-not-allowed bg-[#1a1714] opacity-30"}`}
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              {ctaLabel}
              {ctaIcon}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
