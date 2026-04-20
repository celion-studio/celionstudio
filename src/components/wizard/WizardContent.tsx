"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { z } from "zod";
import type { GuideRecord, GuideSource, SourceKind } from "@/types/guide";
import { useGuideWizardStore } from "@/store/useGuideWizardStore";
import { ConceptStep } from "@/components/wizard/ConceptStep";
import { SourceStep } from "@/components/wizard/SourceStep";
import { StyleStep } from "@/components/wizard/StyleStep";
import { OutlineStep } from "@/components/wizard/OutlineStep";

type WizardStep = 1 | 2 | 3 | 4;

const conceptSchema = z.object({
  title: z.string().trim().min(1, "Add a title."),
  targetAudience: z.string().trim().min(1, "Add the target audience."),
  goal: z.string().trim().min(1, "Add the goal."),
});

const styleSchema = z.object({
  tone: z.string().trim().min(1, "Select the tone."),
  structureStyle: z.string().trim().min(1, "Select the structure."),
  readerLevel: z.string().trim().min(1, "Select the reader level."),
  depth: z.string().trim().min(1, "Select the depth."),
});

const STEP_LABELS = ["Concept", "Source", "Style", "Outline"] as const;
const STEP_TITLES = [
  "Define the concept",
  "Add source material",
  "Set the voice",
  "Review the outline",
] as const;
const STEP_DESCRIPTIONS = [
  "Name your ebook and set who it's for.",
  "Paste text or upload your source files.",
  "Choose tone, structure, and depth.",
  "AI-generated chapters — edit freely.",
] as const;

function generateOutline(structureStyle: string): string[] {
  if (structureStyle === "Checklist") {
    return [
      "Before you begin: requirements & mindset",
      "The core checklist",
      "Common mistakes to avoid",
      "Quick-reference card",
    ];
  }
  if (structureStyle === "Step-by-step") {
    return [
      "Getting started",
      "The first step",
      "Building momentum",
      "Advanced moves",
      "Putting it all together",
    ];
  }
  if (structureStyle === "Concept-first") {
    return [
      "The big idea",
      "Why it matters",
      "How it works",
      "Applying it in practice",
      "What comes next",
    ];
  }
  return [
    "Introduction",
    "Understanding the landscape",
    "The core framework",
    "Execution guide",
    "Next steps & resources",
  ];
}

function getFileKind(fileName: string): SourceKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "txt" || ext === "pdf" || ext === "docx") {
    return ext;
  }

  return null;
}

async function buildSources(
  pastedText: string,
  files: File[],
): Promise<GuideSource[]> {
  const sources: GuideSource[] = [];

  if (pastedText.trim()) {
    const content = pastedText.trim();

    sources.push({
      id: crypto.randomUUID(),
      kind: "pasted_text",
      name: "Pasted source",
      content,
      excerpt: content.slice(0, 180),
    });
  }

  for (const file of files) {
    const kind = getFileKind(file.name);
    if (!kind) {
      throw new Error(`${file.name} is not a supported file type.`);
    }

    let content = "";

    if (kind === "md" || kind === "txt") {
      content = (await file.text()).trim();
    } else {
      content = `${file.name} was uploaded successfully. Deep extraction for ${kind.toUpperCase()} files will be connected in the next backend slice.`;
    }

    sources.push({
      id: crypto.randomUUID(),
      kind,
      name: file.name,
      content,
      excerpt: content.slice(0, 180),
    });
  }

  return sources;
}

function getStepIssue(input: {
  step: WizardStep;
  title: string;
  pastedText: string;
  files: File[];
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  outline: string[];
}) {
  if (input.step === 1) {
    const parsed = conceptSchema.safeParse({
      title: input.title,
      targetAudience: input.targetAudience,
      goal: input.goal,
    });
    return parsed.success ? null : parsed.error.issues[0]?.message ?? "Complete this step.";
  }

  if (input.step === 2) {
    if (!input.pastedText.trim() && input.files.length === 0) {
      return "Add text or a file.";
    }

    if (input.files.some((file) => /\.(hwp|hwpx)$/i.test(file.name))) {
      return "HWP and HWPX are not supported.";
    }

    return null;
  }

  if (input.step === 3) {
    const parsed = styleSchema.safeParse({
      tone: input.tone,
      structureStyle: input.structureStyle,
      readerLevel: input.readerLevel,
      depth: input.depth,
    });

    return parsed.success
      ? null
      : parsed.error.issues[0]?.message ?? "Complete this step.";
  }

  if (input.outline.length === 0) return "Add at least one chapter.";
  if (input.outline.some((ch) => !ch.trim())) return "Fill in all chapter titles.";
  return null;
}

export function WizardContent({
  onCreated,
}: {
  onCreated?: (guide: GuideRecord) => void;
}) {
  const router = useRouter();
  const {
    step,
    title,
    pastedText,
    files,
    targetAudience,
    goal,
    depth,
    tone,
    structureStyle,
    readerLevel,
    outline,
    outlineStyleKey,
    error,
    setStep,
    setTitle,
    setPastedText,
    setFiles,
    setField,
    setOutline,
    setGeneratedOutline,
    setError,
    reset,
  } = useGuideWizardStore();

  const [submitting, setSubmitting] = useState(false);
  const currentStepIndex = step - 1;
  const currentStepIssue = getStepIssue({
    step,
    title,
    pastedText,
    files,
    targetAudience,
    goal,
    depth,
    tone,
    structureStyle,
    readerLevel,
    outline,
  });
  const canAdvance = currentStepIssue == null && !submitting;
  const footerMessage = error;

  const handleNext = () => {
    if (currentStepIssue) {
      return;
    }

    if (step === 3 && (outline.length === 0 || outlineStyleKey !== structureStyle)) {
      setGeneratedOutline(generateOutline(structureStyle), structureStyle);
    }

    setStep((step + 1) as WizardStep);
  };

  const handlePrevious = () => {
    if (step === 1 || submitting) {
      return;
    }

    setStep((step - 1) as WizardStep);
  };

  const handleCreate = async () => {
    if (currentStepIssue) {
      return;
    }

    setSubmitting(true);

    try {
      const sources = await buildSources(pastedText, files);
      if (sources.length === 0) {
        setError("No usable source content was found.");
        return;
      }

      const response = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sources,
          profile: {
            targetAudience,
            goal,
            depth,
            tone,
            structureStyle,
            readerLevel,
            outline,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { guide?: GuideRecord; message?: string }
        | null;

      if (!response.ok || !payload?.guide) {
        throw new Error(payload?.message ?? "Celion could not create the draft.");
      }

      reset();
      onCreated?.(payload.guide);
      router.push(`/builder/${payload.guide.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Celion could not create the guide draft.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#8a867e",
            fontFamily: "'Geist', sans-serif",
            fontWeight: 500,
          }}
        >
          Step {step} of {STEP_LABELS.length}
        </p>
        <h1
          style={{
            margin: "10px 0 0",
            fontFamily: "'Geist', sans-serif",
            fontSize: "clamp(28px, 3.5vw, 38px)",
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
            fontWeight: 500,
            color: "#111",
          }}
        >
          {STEP_TITLES[currentStepIndex]}
        </h1>
        <p className="mt-4 text-[14px] leading-7 text-muted">
          {STEP_DESCRIPTIONS[currentStepIndex]}
        </p>

        <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-[#ebe7dd]">
          <div
            style={{
              width: `${(step / STEP_LABELS.length) * 100}%`,
              height: "100%",
              background: "#111",
              transition: "width 0.2s ease",
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STEP_LABELS.map((label, index) => {
            const stepNumber = (index + 1) as WizardStep;
            const isActive = step === stepNumber;
            const isDone = step > stepNumber;

            return (
              <div
                key={label}
                className="rounded-[8px] border px-3 py-1.5 text-[12px]"
                style={{
                  borderColor: isActive || isDone ? "#11110f" : "#ebe7dd",
                  background: isActive ? "#11110f" : "#ffffff",
                  color: isActive ? "#fff" : "#4a443d",
                  fontFamily: "'Geist', sans-serif",
                  fontWeight: 500,
                }}
              >
                {stepNumber}. {label}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] border border-line bg-white px-6 py-6 md:px-8 md:py-8">
        <div className="py-1">
          {step === 1 ? (
            <ConceptStep
              title={title}
              targetAudience={targetAudience}
              goal={goal}
              onTitleChange={setTitle}
              onFieldChange={setField}
            />
          ) : null}
          {step === 2 ? (
            <SourceStep
              pastedText={pastedText}
              fileNames={files.map((file) => file.name)}
              onTextChange={setPastedText}
              onFilesChange={setFiles}
            />
          ) : null}
          {step === 3 ? (
            <StyleStep
              tone={tone}
              structureStyle={structureStyle}
              readerLevel={readerLevel}
              depth={depth}
              onFieldChange={setField}
            />
          ) : null}
          {step === 4 ? (
            <OutlineStep outline={outline} onOutlineChange={setOutline} />
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            {footerMessage ? (
              <p style={{ margin: 0, fontSize: "13px", color: "#9b4c19" }}>
                {footerMessage}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {step > 1 ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handlePrevious}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  border: "1px solid #ECEAE5",
                  borderRadius: "8px",
                  background: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#111",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <ArrowLeft size={13} />
                Previous
              </button>
            ) : null}
            {step < STEP_LABELS.length ? (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleNext}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#111",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#fff",
                  cursor: canAdvance ? "pointer" : "not-allowed",
                  opacity: canAdvance ? 1 : 0.35,
                }}
              >
                Continue
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={handleCreate}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 22px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#111",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#fff",
                  cursor: canAdvance ? "pointer" : "not-allowed",
                  opacity: canAdvance ? 1 : 0.35,
                }}
              >
                {submitting ? "Creating..." : "Create draft"}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
