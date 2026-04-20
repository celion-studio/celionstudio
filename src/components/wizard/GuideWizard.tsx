"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { z } from "zod";
import type { GuideSource, SourceKind } from "@/types/guide";
import type { GuideRecord } from "@/types/guide";
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
  onCreated: (guide: GuideRecord) => void;
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

      const response = await fetch("/api/guides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      onCreated(payload.guide);
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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(17,17,15,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "900px", height: "min(680px, 90vh)", background: "#fff", borderRadius: "16px", border: "1px solid #ECEAE5", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.18)", fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid #ECEAE5", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", fontFamily: "'Geist', sans-serif", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A1A1AA" }}>New draft</p>
            <h2 style={{ margin: "4px 0 0", fontFamily: "'Geist', sans-serif", fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em", color: "#111" }}>
              {["Add your source material", "Set your target profile", "Tune the writing style"][step - 1]}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #ECEAE5", background: "#FAFAF9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#71717A" }}
            aria-label="Close wizard"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #ECEAE5", flexShrink: 0 }}>
          {["Source intake", "Draft direction", "Style tuning"].map((label, i) => {
            const isActive = step === i + 1;
            const isDone = step > i + 1;
            return (
              <div key={label} style={{ flex: 1, padding: "12px 20px", borderRight: i < 2 ? "1px solid #ECEAE5" : undefined, background: isActive ? "#F0EEE9" : "#FAFAF9", transition: "background 0.15s" }}>
                <p style={{ margin: 0, fontSize: "11px", fontFamily: "'Geist', sans-serif", fontWeight: 500, color: isDone ? "#16A34A" : isActive ? "#111" : "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {`Step ${i + 1}`}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", fontWeight: isActive ? 500 : 400, color: isActive ? "#111" : "#71717A" }}>{label}</p>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          {step === 1 && <SourceStep pastedText={pastedText} fileNames={files.map((f) => f.name)} error={error} onTextChange={setPastedText} onFilesChange={setFiles} />}
          {step === 2 && <ProfileStep targetAudience={targetAudience} goal={goal} depth={depth} onFieldChange={setField} />}
          {step === 3 && <StyleStep tone={tone} structureStyle={structureStyle} readerLevel={readerLevel} onFieldChange={setField} />}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderTop: "1px solid #ECEAE5", flexShrink: 0, background: "#FAFAF9" }}>
          <div>
            {error && <p style={{ margin: 0, fontSize: "13px", color: "#9b4c19", background: "#FFF5F2", padding: "8px 14px", borderRadius: "8px" }}>{error}</p>}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "1px solid #ECEAE5", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#111", cursor: "pointer" }}
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "8px", background: "#111", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#fff", cursor: "pointer" }}
              >
                Continue
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 20px", border: "none", borderRadius: "8px", background: "#111", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Creating..." : "Open builder"}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
