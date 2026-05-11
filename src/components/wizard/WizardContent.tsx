"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileUp, ListChecks, Plus, Zap } from "lucide-react";
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
  onStartBlank?: () => void;
};

type StartMode = "questionnaire" | "files" | "blank";

const START_OPTIONS: Array<{
  mode: StartMode;
  title: string;
  description: string;
  tag?: string;
  icon: "questionnaire" | "files" | "blank";
}> = [
  {
    mode: "questionnaire",
    title: "Start with questionnaire",
    description: "Answer a few prompts so Celion can shape the brief before drafting.",
    tag: "Recommended",
    icon: "questionnaire",
  },
  {
    mode: "files",
    title: "Extract content from files",
    description: "Upload notes, transcripts, or docs first and build from the source.",
    icon: "files",
  },
  {
    mode: "blank",
    title: "Start a blank project",
    description: "Open an empty workspace and decide the structure manually.",
    icon: "blank",
  },
];

function StartOptionIcon({ name }: { name: "questionnaire" | "files" | "blank" }) {
  if (name === "questionnaire") return <ListChecks size={22} strokeWidth={1.65} />;
  if (name === "files") return <FileUp size={22} strokeWidth={1.65} />;
  return <Plus size={22} strokeWidth={1.65} />;
}

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
  onStartBlank,
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
  const [startMode, setStartMode] = useState<StartMode | null>(null);

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

  const handleStartModeSelect = (mode: StartMode) => {
    setStartMode(mode);
    setError("");
    if (mode === "files") {
      setStep(3);
      return;
    }
    if (mode === "blank") {
      onStartBlank?.();
    }
  };

  if (!startMode && variant === "editor") {
    return (
      <div className="wizard-start-shell">
        <section className="wizard-start-copy">
          <h1>How would you like to start?</h1>
        </section>

        <div className="wizard-start-grid" aria-label="Choose how to start">
          {START_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              className="wizard-start-card"
              onClick={() => handleStartModeSelect(option.mode)}
            >
              <span className="wizard-start-preview" aria-hidden="true">
                <span className="wizard-start-icon">
                  <StartOptionIcon name={option.icon} />
                </span>
                {option.tag ? (
                  <span className="wizard-start-tag">
                    {option.tag}
                  </span>
                ) : null}
              </span>
              <span className="wizard-start-title">
                {option.title}
              </span>
              <span className="wizard-start-description">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-content-shell">
      <section className="wizard-hero" data-compact={compact}>
        <h1 className="wizard-hero-title">
          {STEP_TITLES[currentStepIndex]}
        </h1>
        <p className="wizard-hero-description">
          {STEP_DESCRIPTIONS[currentStepIndex]}
        </p>

        <div className="wizard-progress-wrap">
          <div className="wizard-progress-list">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isDone = step > stepNumber;
              const canSelectStep = !busy && (isDone || stepNumber === step);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (canSelectStep) {
                      setStep(stepNumber as WizardStep);
                    }
                  }}
                  className="wizard-progress-step"
                  data-state={isActive ? "active" : isDone ? "done" : "upcoming"}
                  data-clickable={canSelectStep}
                >
                  <span className="wizard-progress-number">
                    {stepNumber}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section key={step} className="step-in wizard-step-pane">
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

      <div className="wizard-footer">
          <div>
            {error ? (
              <span className="wizard-error-pill">
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
                className="wizard-nav-button wizard-nav-button-secondary"
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
              className="wizard-nav-button wizard-nav-button-primary"
            >
              {ctaLabel}
              {ctaIcon}
            </CelionButton>
          </div>
        </div>
    </div>
  );
}
