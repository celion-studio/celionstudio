"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { z } from "zod";
import { useProjectWizardStore } from "@/store/useProjectWizardStore";
import type { WizardPurpose, WizardStep } from "@/store/useProjectWizardStore";
import { BasicsStep } from "@/components/wizard/BasicsStep";
import { StyleStep } from "@/components/wizard/StyleStep";
import { SourceStepEbook } from "@/components/wizard/SourceStepEbook";
import { GenerateStepEbook } from "@/components/wizard/GenerateStepEbook";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";

export const TOTAL_STEPS = 4;

export const STEP_LABELS = ["Basics", "Style", "Source", "Generate"] as const;
export const STEP_TITLES = [
  "Set up your ebook",
  "Choose style and accent",
  "Add your source",
  "Generate your ebook",
] as const;
export const STEP_DESCRIPTIONS = [
  "Title, author, target reader, and purpose.",
  "Pick the visual style and accent color for your ebook design.",
  "Upload source files for the AI to use.",
  "Celion will generate a source-led A5 HTML/CSS slide publication.",
] as const;

const basicsSchema = z.object({
  title: z.string().trim().min(1, "Add a title."),
  targetAudience: z.string().trim().min(1, "Add the target reader."),
  purpose: z.string().trim().min(1, "Add the purpose."),
});

const PURPOSE_PROMPTS: Record<Exclude<WizardPurpose, "" | "other">, string> = {
  sell: "Sell or promote a product, service, offer, or paid guide.",
  teach: "Teach a method, skill, framework, or practical lesson.",
  organize: "Organize expertise into a polished reference, guide, or point of view.",
  report: "Turn source material into a concise report, briefing, or explainer.",
};

function resolvePurpose(purpose: WizardPurpose, purposeDetail: string) {
  if (purpose === "other") return purposeDetail.trim();
  if (!purpose) return "";
  return PURPOSE_PROMPTS[purpose];
}

function getStepIssue(step: WizardStep, state: ReturnType<typeof useProjectWizardStore.getState>): string | null {
  if (step === 1) {
    const result = basicsSchema.safeParse({
      title: state.title,
      targetAudience: state.targetAudience,
      purpose: resolvePurpose(state.purpose, state.purposeDetail),
    });
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
  const resetOnUnmountRef = useRef(false);
  const store = useProjectWizardStore();
  const {
    step, title, author, targetAudience, purpose, purposeDetail, tone,
    ebookStyle, accentColor, sourceFiles,
    generating, error,
    setStep, setField, setPurpose, setTone, setEbookStyle, setAccentColor,
    setSourceFiles, setGenerating, setError, reset,
  } = store;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (resetOnUnmountRef.current) reset();
    };
  }, [reset]);

  const currentIssue = getStepIssue(step, store);
  const busy = submitting || generating;
  const canAdvance = currentIssue == null && !busy;
  const currentStepIndex = step - 1;
  const promptSourceText = formatSourcesForPrompt(sourceFiles, "");
  const resolvedPurpose = resolvePurpose(purpose, purposeDetail);

  const handlePrevious = () => {
    if (step === 1 || busy) return;
    setStep((step - 1) as WizardStep);
  };

  const handleNext = async () => {
    if (busy || currentIssue) return;

    if (step < TOTAL_STEPS) {
      setStep((step + 1) as WizardStep);
      return;
    }

    // Step 4: generate ebook
    if (!isSignedIn) {
      setError("Sign in before generating so Celion can save your ebook.");
      return;
    }

    setSubmitting(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/ebook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, purpose: resolvedPurpose, targetAudience, tone, sourceText: promptSourceText, sources: sourceFiles, ebookStyle, accentColor }),
      });
      const data = await res.json() as { projectId?: string; message?: string };
      if (!res.ok || !data.projectId) throw new Error(data.message ?? "Could not generate ebook.");
      resetOnUnmountRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(`/editor/${data.projectId}` as any);
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (!resetOnUnmountRef.current) {
        setSubmitting(false);
        setGenerating(false);
      }
    }
  };

  const ctaLabel = generating || submitting
    ? "Generating..."
    : step === TOTAL_STEPS
        ? "Generate ebook"
        : "Continue";

  const ctaIcon = step === TOTAL_STEPS ? <Zap size={13} /> : <ArrowRight size={12} />;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <section style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Geist', sans-serif",
            fontSize: "clamp(25px, 3vw, 36px)",
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
            fontWeight: 500,
            color: "#17191d",
          }}
        >
          {STEP_TITLES[currentStepIndex]}
        </h1>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", minWidth: 0 }}>
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isDone = step > stepNumber;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (!busy && (isDone || stepNumber === step)) {
                      setStep(stepNumber as WizardStep);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: !busy && (isDone || stepNumber === step) ? "pointer" : "default",
                    color: isActive ? "#17191d" : isDone ? "#4b515a" : "#b6bbc2",
                    fontFamily: "'Geist', sans-serif",
                    fontSize: "11.5px",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: isActive || isDone ? "1px solid #24272c" : "1px solid #d7dbe0",
                      background: isDone ? "#24272c" : isActive ? "#ffffff" : "#f6f7f8",
                      color: isDone ? "#ffffff" : isActive ? "#24272c" : "#858b93",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {stepNumber}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section key={step} className="step-in">
        {step === 1 && (
          <BasicsStep
            title={title}
            author={author}
            targetAudience={targetAudience}
            purpose={purpose}
            purposeDetail={purposeDetail}
            tone={tone}
            onFieldChange={setField}
            onPurposeChange={setPurpose}
            onToneChange={setTone}
          />
        )}
        {step === 2 && (
          <StyleStep
            ebookStyle={ebookStyle}
            onStyleChange={setEbookStyle}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
          />
        )}
        {step === 3 && (
          <SourceStepEbook
            sources={sourceFiles}
            sourceTextLength={promptSourceText.length}
            onSourceFilesChange={setSourceFiles}
            onError={setError}
          />
        )}
        {step === 4 && (
          <GenerateStepEbook
            title={title}
            author={author}
            ebookStyle={ebookStyle}
            accentColor={accentColor}
            generating={generating}
          />
        )}
      </section>

      <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #eef0f2", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            {error ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#5f6670", fontFamily: "'Geist', sans-serif", background: "#f7f6f3", border: "1px solid #e5e2dc", borderRadius: "4px", padding: "5px 10px" }}>
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
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#e1e4e8] bg-white px-4 py-2.5 text-[13px] font-medium text-[#4b515a] transition-all duration-150 hover:border-[#c5cad1] hover:text-[#17191d] disabled:cursor-not-allowed disabled:opacity-50"
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
              className={`inline-flex items-center gap-1.5 rounded-[4px] px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-150 ${canAdvance ? "cursor-pointer bg-[#1a1714] hover:-translate-y-px hover:bg-[#2d2925] hover:shadow-[0_4px_16px_rgba(0,0,0,0.16)]" : "cursor-not-allowed bg-[#1a1714] opacity-30"}`}
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              {ctaLabel}
              {ctaIcon}
            </button>
          </div>
        </div>
    </div>
  );
}
