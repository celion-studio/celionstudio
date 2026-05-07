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
import { PlanStepEbook } from "@/components/wizard/PlanStepEbook";
import { GenerateStepEbook } from "@/components/wizard/GenerateStepEbook";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";
import type { EbookPlan } from "@/lib/ebook-generation";
import type { ProjectRecord } from "@/types/project";
import { CelionButton } from "@/components/ui/celion-controls";

export const TOTAL_STEPS = 5;

export const STEP_LABELS = ["Basics", "Style", "Source", "Plan", "Generate"] as const;
export const STEP_TITLES = [
  "Set up your ebook",
  "Choose style and accent",
  "Add your source",
  "Review the plan",
  "Generate your ebook",
] as const;
export const STEP_DESCRIPTIONS = [
  "Title, author, target reader, and purpose.",
  "Pick the visual style and accent color for your ebook design.",
  "Upload source files for the AI to use.",
  "Check the source-led plan before final design.",
  "Celion will render the approved plan into an editable ebook.",
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

type WizardContentProps = {
  projectId?: string;
  variant?: "page" | "editor";
  onGenerated?: (project: ProjectRecord) => void;
};

export function getStepIssue(step: WizardStep, state: ReturnType<typeof useProjectWizardStore.getState>): string | null {
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
  if (step === 3) {
    if (state.sourceFiles.length === 0) return "Add at least one source file to continue.";
    return null;
  }
  if (step === 4) {
    if (!state.plan) return "Create a plan to continue.";
    return null;
  }
  if (step === 5) {
    if (!state.plan) return "Create a plan before generating.";
    return null;
  }
  return null;
}

export function WizardContent({
  projectId,
  variant = "page",
  onGenerated,
}: WizardContentProps = {}) {
  const router = useRouter();
  const resetOnUnmountRef = useRef(false);
  const initializedProjectIdRef = useRef<string | null>(null);
  const store = useProjectWizardStore();
  const {
    step, title, author, targetAudience, purpose, purposeDetail, tone,
    ebookStyle, accentColor, sourceFiles,
    plan, planning, generating, error,
    setStep, setField, setPurpose, setTone, setEbookStyle, setAccentColor,
    setSourceFiles, setPlan, setPlanning, setGenerating, setError, reset,
  } = store;

  const [submitting, setSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);

  useEffect(() => {
    return () => {
      if (resetOnUnmountRef.current) reset();
    };
  }, [reset]);

  useEffect(() => {
    if (!projectId || initializedProjectIdRef.current === projectId) return;
    initializedProjectIdRef.current = projectId;
    reset();
  }, [projectId, reset]);

  useEffect(() => {
    if (step !== 4) setEditingPlan(false);
  }, [step]);

  const currentIssue = getStepIssue(step, store);
  const busy = submitting || generating || planning;
  const canAdvance = currentIssue == null && !busy && !editingPlan;
  const currentStepIndex = step - 1;
  const compact = variant === "editor";
  const promptSourceText = formatSourcesForPrompt(sourceFiles, "");
  const fallbackSourceText = sourceFiles.length > 0 ? "" : promptSourceText;
  const resolvedPurpose = resolvePurpose(purpose, purposeDetail);
  const requestPayload = {
    ...(projectId ? { projectId } : {}),
    title,
    author,
    purpose: resolvedPurpose,
    targetAudience,
    tone,
    sourceText: fallbackSourceText,
    sources: sourceFiles,
    ebookStyle,
    accentColor,
  };

  const handlePrevious = () => {
    if (step === 1 || busy) return;
    setEditingPlan(false);
    setStep((step - 1) as WizardStep);
  };

  async function createPlan() {
    setPlanning(true);
    setEditingPlan(false);
    setError("");
    try {
      const res = await fetch("/api/ebook/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const data = await res.json() as { plan?: EbookPlan; message?: string };
      if (!res.ok || !data.plan) throw new Error(data.message ?? "Could not create plan.");
      setPlan(data.plan);
      setStep(4);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setPlanning(false);
    }
  }

  const handleBackToSource = () => {
    if (busy) return;
    setEditingPlan(false);
    setStep(3);
  };

  const handleRegeneratePlan = () => {
    if (busy) return;
    void createPlan();
  };

  const handleNext = async () => {
    if (busy || currentIssue || editingPlan) return;

    if (step === 3) {
      if (plan) {
        setStep(4);
        return;
      }

      await createPlan();
      return;
    }

    if (step < TOTAL_STEPS) {
      setEditingPlan(false);
      setStep((step + 1) as WizardStep);
      return;
    }

    // Step 5: generate ebook
    setSubmitting(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/ebook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestPayload, plan }),
      });
      const data = await res.json() as { projectId?: string; project?: ProjectRecord; message?: string };
      if (!res.ok || !data.projectId) throw new Error(data.message ?? "Could not generate ebook.");
      if (onGenerated && data.project) {
        resetOnUnmountRef.current = true;
        onGenerated(data.project);
        return;
      }
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

  const ctaLabel = planning
    ? "Planning..."
    : generating || submitting
    ? "Generating..."
    : step === 3
        ? "Create plan"
    : step === TOTAL_STEPS
        ? "Generate ebook"
        : "Continue";

  const ctaIcon = step === TOTAL_STEPS ? <Zap size={13} /> : <ArrowRight size={12} />;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "820px",
        margin: "0 auto",
      }}
    >
      <section style={{ marginBottom: compact ? "34px" : "52px", textAlign: compact ? "left" : "center" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Geist', sans-serif",
            fontSize: compact ? "26px" : "34px",
            lineHeight: compact ? 1.14 : 1.08,
            letterSpacing: 0,
            fontWeight: 500,
            color: "#17191d",
          }}
        >
          {STEP_TITLES[currentStepIndex]}
        </h1>
        <p
          style={{
            margin: compact ? "8px 0 0" : "12px auto 0",
            maxWidth: compact ? "560px" : "420px",
            fontFamily: "'Geist', sans-serif",
            fontSize: "13.5px",
            lineHeight: 1.55,
            color: "#858b93",
          }}
        >
          {STEP_DESCRIPTIONS[currentStepIndex]}
        </p>

        <div style={{ display: "flex", justifyContent: compact ? "flex-start" : "center", marginTop: compact ? "22px" : "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", minWidth: 0, flexWrap: "wrap" }}>
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
                      borderRadius: "6px",
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

      <section key={step} className="step-in" style={{ marginTop: "0" }}>
        {step === 1 && (
          <BasicsStep
            title={title}
            author={author}
            targetAudience={targetAudience}
            purpose={purpose}
            purposeDetail={purposeDetail}
            onFieldChange={setField}
            onPurposeChange={setPurpose}
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
            tone={tone}
            onSourceFilesChange={setSourceFiles}
            onToneChange={setTone}
            onError={setError}
          />
        )}
        {step === 4 && (
          <PlanStepEbook
            plan={plan}
            planning={planning}
            onBackToSource={handleBackToSource}
            onRegeneratePlan={handleRegeneratePlan}
            onPlanChange={setPlan}
            onEditingChange={setEditingPlan}
          />
        )}
        {step === 5 && (
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#5f6670", fontFamily: "'Geist', sans-serif", background: "#f7f6f3", border: "1px solid #e5e2dc", borderRadius: "6px", padding: "5px 10px" }}>
                {error}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <CelionButton
                disabled={busy}
                onClick={handlePrevious}
                size="md"
                variant="secondary"
                style={{ minHeight: "38px", padding: "0 16px" }}
              >
                <ArrowLeft size={12} />
                Previous
              </CelionButton>
            )}

            <CelionButton
              disabled={!canAdvance}
              onClick={handleNext}
              size="md"
              variant="primary"
              style={{ minHeight: "38px", padding: "0 20px" }}
            >
              {ctaLabel}
              {ctaIcon}
            </CelionButton>
          </div>
        </div>
    </div>
  );
}
