"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { z } from "zod";
import { createGuideRecord } from "@/lib/celion-model";
import { saveGuide } from "@/lib/guide-storage";
import type { GuideSource, SourceKind } from "@/types/guide";
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

export function GuideWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
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

  const validateStep = () => {
    if (step === 1) {
      if (!pastedText.trim() && files.length === 0) {
        setError("At least one pasted source or uploaded file is required.");
        return false;
      }

      const hwpFile = files.find((file) => /\.(hwp|hwpx)$/i.test(file.name));
      if (hwpFile) {
        setError("HWP and HWPX files are not supported in Celion v1.");
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
        setError(parsed.error.issues[0]?.message ?? "Please complete the fields.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    }
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

      const guide = createGuideRecord({
        sources,
        profile: {
          targetAudience,
          goal,
          depth,
          tone,
          structureStyle,
          readerLevel,
        },
      });

      saveGuide(guide);
      reset();
      onCreated();
      router.push(`/builder/${guide.id}`);
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
    <div className="fixed inset-0 z-50 bg-[#161511]/70 p-4 backdrop-blur-sm md:p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col rounded-[36px] border border-white/10 bg-bg shadow-float">
        <div className="flex items-center justify-between border-b border-line px-6 py-5 md:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
              New ebook wizard
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.03em] text-text">
              Shape the draft before the builder opens
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-full border border-line bg-white/70 p-3 text-text transition hover:bg-white"
            aria-label="Close wizard"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-hidden px-6 py-6 md:grid-cols-[240px_1fr] md:px-8">
          <aside className="rounded-[28px] border border-line bg-white/70 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              Flow
            </p>
            <div className="mt-5 space-y-3">
              {[
                "1. Source intake",
                "2. Ebook direction",
                "3. Style tuning",
              ].map((label, index) => (
                <div
                  key={label}
                  className={`rounded-[20px] border px-4 py-4 text-sm transition ${
                    step === index + 1
                      ? "border-text bg-text text-white"
                      : "border-line bg-[#fcfaf4] text-muted"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </aside>

          <div className="flex flex-col justify-between gap-6 overflow-y-auto rounded-[28px] border border-line bg-surface p-5 md:p-6">
            <div className="space-y-5">
              {step === 1 ? (
                <SourceStep
                  pastedText={pastedText}
                  fileNames={files.map((file) => file.name)}
                  error={error}
                  onTextChange={setPastedText}
                  onFilesChange={setFiles}
                />
              ) : null}

              {step === 2 ? (
                <ProfileStep
                  targetAudience={targetAudience}
                  goal={goal}
                  depth={depth}
                  onFieldChange={setField}
                />
              ) : null}

              {step === 3 ? (
                <StyleStep
                  tone={tone}
                  structureStyle={structureStyle}
                  readerLevel={readerLevel}
                  onFieldChange={setField}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
              {error ? (
                <p className="rounded-[18px] bg-[#fff1e6] px-4 py-3 text-sm text-[#9b4c19]">
                  {error}
                </p>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3 self-end">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-medium text-text transition hover:bg-white"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                ) : null}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5"
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Open builder"}
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
