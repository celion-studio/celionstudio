"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { z } from "zod";
import type { ProjectRecord, ProjectSource, SourceKind } from "@/types/project";
import { useProjectWizardStore } from "@/store/useProjectWizardStore";
import type { WizardStep } from "@/store/useProjectWizardStore";
import { BasicsStep } from "@/components/wizard/BasicsStep";
import { SourceStep } from "@/components/wizard/SourceStep";
import { FormatStep } from "@/components/wizard/FormatStep";
import { GenerateStep } from "@/components/wizard/GenerateStep";

const TOTAL_STEPS = 4;

const STEP_LABELS = ["Setup", "Source", "Format", "Generate"] as const;
const STEP_TITLES = [
  "Set up your ebook",
  "Upload your source",
  "Choose the page format",
  "Generate your editable draft",
] as const;
const STEP_DESCRIPTIONS = [
  "Title, author, target reader, core message, and tone.",
  "Add the document material Celion should turn into an ebook.",
  "Use the ebook default or switch to a print/custom size.",
  "Celion will create an editable document you can refine directly.",
] as const;

const basicsSchema = z.object({
  title: z.string().trim().min(1, "Add a title."),
  targetAudience: z.string().trim().min(1, "Add the target reader."),
  coreMessage: z.string().trim().min(1, "Add the core message."),
});

function getStepIssue(
  step: WizardStep,
  state: {
    title: string;
    targetAudience: string;
    coreMessage: string;
    files: File[];
  },
): string | null {
  if (step === 1) {
    const result = basicsSchema.safeParse({
      title: state.title,
      targetAudience: state.targetAudience,
      coreMessage: state.coreMessage,
    });
    return result.success ? null : (result.error.issues[0]?.message ?? "Complete this step.");
  }
  if (step === 2) {
    if (state.files.length === 0) return "Upload at least one source document.";
    if (state.files.some((file) => /\.(hwp|hwpx)$/i.test(file.name))) {
      return "HWP files are not supported.";
    }
    if (state.files.some((file) => /\.(pdf|docx)$/i.test(file.name))) {
      return "PDF/DOCX extraction is not connected yet. Use MD or TXT for now.";
    }
    return null;
  }
  return null;
}

function getFileKind(fileName: string): SourceKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "txt") return ext;
  if (ext === "pdf" || ext === "docx") {
    throw new Error("PDF/DOCX extraction is not connected yet. Use MD or TXT for now.");
  }
  return null;
}

async function buildSources(files: File[]): Promise<ProjectSource[]> {
  const sources: ProjectSource[] = [];

  for (const file of files) {
    const kind = getFileKind(file.name);
    if (!kind) throw new Error(`${file.name} is not a supported file type.`);

    const content = (await file.text()).trim();

    if (!content) throw new Error(`${file.name} is empty.`);

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

export function WizardContent({ onCreated }: { onCreated?: (project: ProjectRecord) => void }) {
  const router = useRouter();
  const {
    step,
    title,
    author,
    targetAudience,
    coreMessage,
    tone,
    files,
    pageFormat,
    customPageSize,
    generating,
    error,
    setStep,
    setField,
    setTone,
    setFiles,
    setPageFormat,
    setGenerating,
    setError,
    reset,
  } = useProjectWizardStore();

  const [submitting, setSubmitting] = useState(false);

  const currentIssue = getStepIssue(step, {
    title,
    targetAudience,
    coreMessage,
    files,
  });
  const busy = submitting || generating;
  const canAdvance = currentIssue == null && !busy;
  const currentStepIndex = step - 1;

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

    setSubmitting(true);
    setGenerating(true);
    try {
      const sources = await buildSources(files);
      if (sources.length === 0) throw new Error("No usable source files.");

      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sources,
          profile: {
            author,
            targetAudience,
            coreMessage,
            designMode: "text",
            pageFormat,
            customPageSize,
            tone,
            plan: null,
            document: {
              type: "tiptap-book",
              version: 1,
              pages: [{ id: "page-1", doc: { type: "doc", content: [{ type: "paragraph" }] } }],
            },
          },
        }),
      });
      const created = (await createRes.json().catch(() => null)) as {
        project?: ProjectRecord;
        message?: string;
      } | null;
      if (!createRes.ok || !created?.project) {
        throw new Error(created?.message ?? "Could not create draft.");
      }

      const generateRes = await fetch(`/api/projects/${created.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const generated = (await generateRes.json().catch(() => null)) as {
        project?: ProjectRecord;
        message?: string;
      } | null;
      if (!generateRes.ok || !generated?.project) {
        throw new Error(generated?.message ?? "Could not generate the ebook.");
      }

      reset();
      onCreated?.(generated.project);
      router.push(`/editor/${generated.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  const ctaLabel = generating || submitting
    ? "Generating..."
    : step === TOTAL_STEPS
      ? "Generate ebook"
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
                background: step > index ? "#1a1714" : "#ebe7dd",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>
      </section>

      <section style={{ borderRadius: "10px", border: "1px solid #ebe7dd", background: "linear-gradient(180deg, #ffffff 0%, #fefcf9 100%)", boxShadow: "0 4px 32px rgba(31,22,14,0.06), 0 1px 2px rgba(0,0,0,0.03)", overflow: "hidden" }}>
        <div key={step} className="step-in px-6 pt-7 pb-2 md:px-8 md:pt-8">
          {step === 1 && (
            <BasicsStep
              title={title}
              author={author}
              targetAudience={targetAudience}
              coreMessage={coreMessage}
              tone={tone}
              onFieldChange={setField}
              onToneChange={setTone}
            />
          )}
          {step === 2 && (
            <SourceStep
              fileNames={files.map((file) => file.name)}
              onFilesChange={setFiles}
            />
          )}
          {step === 3 && (
            <FormatStep
              pageFormat={pageFormat}
              customPageSize={customPageSize}
              onPageFormatChange={setPageFormat}
            />
          )}
          {step === 4 && (
            <GenerateStep
              title={title}
              author={author}
              targetAudience={targetAudience}
              tone={tone}
              fileCount={files.length}
              pageFormat={pageFormat}
              customPageSize={customPageSize}
              generating={generating}
            />
          )}
        </div>

        <div style={{ margin: "28px 0 0", padding: "20px 32px 24px", borderTop: "1px solid #f0ece3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            {error ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#7a3b1a", fontFamily: "'Geist', sans-serif", background: "rgba(180,80,30,0.07)", border: "1px solid rgba(180,80,30,0.18)", borderRadius: "6px", padding: "5px 10px" }}>
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
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#e8e4dd] bg-white px-4 py-2.5 text-[13px] font-medium text-[#4a443d] transition-all duration-150 hover:border-[#c8c4bb] hover:text-[#1a1714] disabled:cursor-not-allowed disabled:opacity-50"
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
