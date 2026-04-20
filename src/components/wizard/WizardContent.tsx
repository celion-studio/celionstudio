"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { z } from "zod";
import type { GuideRecord, GuideSource, SourceKind } from "@/types/guide";
import { useGuideWizardStore } from "@/store/useGuideWizardStore";
import { SourceStep } from "@/components/wizard/SourceStep";
import { ProfileStep } from "@/components/wizard/ProfileStep";
import { StyleStep } from "@/components/wizard/StyleStep";

const profileSchema = z.object({
  targetAudience: z.string().min(1, "Target audience is required."),
  goal: z.string().min(1, "Goal is required."),
  depth: z.string().min(1, "Depth is required."),
  tone: z.string().min(1, "Tone is required."),
  structureStyle: z.string().min(1, "Structure style is required."),
  readerLevel: z.string().min(1, "Reader level is required."),
});

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
    sources.push({
      id: crypto.randomUUID(),
      kind: "pasted_text",
      name: "Pasted source",
      content: pastedText.trim(),
      excerpt: pastedText.trim().slice(0, 180),
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

const STEP_LABELS = ["Source intake", "Draft direction", "Style tuning"];
const STEP_TITLES = [
  "Add your source material",
  "Set your target profile",
  "Tune the writing style",
];
const STEP_DESCRIPTIONS = [
  "Bring in notes, transcripts, markdown, or working files. The goal is signal, not perfection.",
  "Tell Celion who this is for and what the draft should accomplish before we shape the structure.",
  "Tune voice, structure, and reader level so the first draft already feels intentionally directed.",
];

export function WizardContent({
  onCreated,
}: {
  onCreated?: (guide: GuideRecord) => void;
}) {
  const router = useRouter();
  const {
    step,
    pastedText,
    files,
    targetAudience,
    goal,
    depth,
    tone,
    structureStyle,
    readerLevel,
    error,
    setStep,
    setPastedText,
    setFiles,
    setField,
    setError,
    reset,
  } = useGuideWizardStore();

  const [submitting, setSubmitting] = useState(false);
  const currentStepIndex = step - 1;

  const validateStep = () => {
    if (step === 1) {
      if (!pastedText.trim() && files.length === 0) {
        setError("At least one pasted source or uploaded file is required.");
        return false;
      }

      const hwpFile = files.find((file) => /\.(hwp|hwpx)$/i.test(file.name));
      if (hwpFile) {
        setError("HWP and HWPX files are not supported.");
        return false;
      }
    }

    if (step >= 2) {
      const parsed = profileSchema.safeParse({
        targetAudience,
        goal,
        depth,
        tone,
        structureStyle,
        readerLevel,
      });

      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Please complete the fields.",
        );
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    setStep((step + 1) as 1 | 2 | 3);
  };

  const handleCreate = async () => {
    if (!validateStep()) {
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
          sources,
          profile: {
            targetAudience,
            goal,
            depth,
            tone,
            structureStyle,
            readerLevel,
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
    <div className="grid gap-10 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-5 xl:sticky xl:top-10 xl:self-start">
        <div className="rounded-[24px] border border-line bg-white/80 px-7 py-8">
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
            Step {step} of 3
          </p>
          <h1
            style={{
              margin: "12px 0 0",
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(30px, 4vw, 42px)",
              lineHeight: 1.04,
              letterSpacing: "-0.05em",
              fontWeight: 500,
              color: "#111",
            }}
          >
            {STEP_TITLES[currentStepIndex]}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {STEP_DESCRIPTIONS[currentStepIndex]}
          </p>
        </div>

        <div className="rounded-[24px] border border-line bg-[#fcfaf4] px-5 py-5">
          <div className="mb-4 h-[3px] w-full overflow-hidden rounded-full bg-[#ebe7dd]">
            <div
              style={{
                width: `${(step / STEP_LABELS.length) * 100}%`,
                height: "100%",
                background: "#111",
                transition: "width 0.2s ease",
              }}
            />
          </div>

          <div className="space-y-3">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isDone = step > stepNumber;

              return (
                <div
                  key={label}
                  className="rounded-[18px] border px-4 py-4"
                  style={{
                    borderColor: isActive ? "#11110f" : "#ebe7dd",
                    background: isActive ? "#ffffff" : "transparent",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: isDone ? "#1f7a4f" : isActive ? "#111" : "#8a867e",
                      fontFamily: "'Geist', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    Step {stepNumber}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "14px",
                      color: isActive ? "#111" : "#4a443d",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-dashed border-line bg-transparent px-5 py-5">
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
            What happens next
          </p>
          <p className="mt-3 text-[14px] leading-7 text-muted">
            When you finish this wizard, Celion opens the builder with your
            first structured draft ready for revision.
          </p>
        </div>
      </aside>

      <section className="rounded-[28px] border border-line bg-white/90 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: "#8a867e",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "'Geist', sans-serif",
                fontWeight: 500,
              }}
            >
              New ebook
            </p>
            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "22px",
                color: "#111",
                fontFamily: "'Geist', sans-serif",
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              {STEP_LABELS[currentStepIndex]}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {STEP_LABELS.map((label, index) => (
              <div
                key={label}
                className="rounded-full border px-3 py-1.5 text-[12px]"
                style={{
                  borderColor: step === index + 1 ? "#11110f" : "#ebe7dd",
                  background: step === index + 1 ? "#11110f" : "#ffffff",
                  color: step === index + 1 ? "#fff" : "#4a443d",
                  fontFamily: "'Geist', sans-serif",
                  fontWeight: 500,
                }}
              >
                {index + 1}. {label}
              </div>
            ))}
          </div>
        </div>

        <div className="py-8">
          {step === 1 && (
            <SourceStep
              pastedText={pastedText}
              fileNames={files.map((file) => file.name)}
              error={error}
              onTextChange={setPastedText}
              onFilesChange={setFiles}
            />
          )}
          {step === 2 && (
            <ProfileStep
              targetAudience={targetAudience}
              goal={goal}
              depth={depth}
              onFieldChange={setField}
            />
          )}
          {step === 3 && (
            <StyleStep
              tone={tone}
              structureStyle={structureStyle}
              readerLevel={readerLevel}
              onFieldChange={setField}
            />
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            {error ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#9b4c19",
                  background: "#FFF5F2",
                  padding: "10px 14px",
                  borderRadius: "12px",
                }}
              >
                {error}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "#8a867e" }}>
                {step < 3
                  ? "Refine the inputs now so the builder opens with stronger structure."
                  : "Everything is ready. We will move straight into the builder."}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  border: "1px solid #ECEAE5",
                  borderRadius: "12px",
                  background: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#111",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#111",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Continue
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 22px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#111",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Geist', sans-serif",
                  color: "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Creating..." : "Open builder"}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
