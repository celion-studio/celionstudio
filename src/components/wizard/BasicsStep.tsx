"use client";

import type { WizardPurpose, WizardTone } from "@/store/useProjectWizardStore";

const inputClass =
  "mt-2 w-full rounded-[9px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-[#1a1714] outline-none transition-all duration-150 placeholder:text-[#c0bbb4] focus:border-[#1a1714] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,22,14,0.07)]";

const toneOptions: { value: WizardTone; label: string; description: string }[] = [
  {
    value: "preserve",
    label: "Keep source voice",
    description: "Stay as close as possible to the uploaded material.",
  },
  {
    value: "clear",
    label: "Clear and concise",
    description: "Tighten the writing without changing the substance.",
  },
  {
    value: "practical",
    label: "Practical",
    description: "Make it direct, useful, and action-oriented.",
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "Shape it like a polished nonfiction essay.",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Use a warmer, easier reading voice.",
  },
];

const purposeOptions: {
  value: Exclude<WizardPurpose, "">;
  label: string;
  description: string;
}[] = [
  {
    value: "sell",
    label: "Sell or promote",
    description: "Package the source as a persuasive sales or lead-generation publication.",
  },
  {
    value: "teach",
    label: "Teach a method",
    description: "Turn knowledge into a clear lesson, guide, or practical learning asset.",
  },
  {
    value: "organize",
    label: "Organize expertise",
    description: "Structure scattered knowledge into a polished reference or point of view.",
  },
  {
    value: "report",
    label: "Report or brief",
    description: "Summarize source material into a concise report, briefing, or explainer.",
  },
  {
    value: "other",
    label: "Other",
    description: "Describe the exact purpose in your own words.",
  },
];

function Label({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
        {children}
      </p>
      {hint ? (
        <p
          className="mt-0.5 text-[12px] text-[#b8b4aa]"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type BasicsStepProps = {
  title: string;
  author: string;
  targetAudience: string;
  purpose: WizardPurpose;
  purposeDetail: string;
  tone: WizardTone;
  onFieldChange: (
    field: "title" | "author" | "targetAudience" | "purposeDetail",
    value: string,
  ) => void;
  onPurposeChange: (purpose: WizardPurpose) => void;
  onToneChange: (tone: WizardTone) => void;
};

export function BasicsStep({
  title,
  author,
  targetAudience,
  purpose,
  purposeDetail,
  tone,
  onFieldChange,
  onPurposeChange,
  onToneChange,
}: BasicsStepProps) {
  const selectedPurpose = purposeOptions.find((option) => option.value === purpose);

  return (
    <div className="space-y-5">
      <label className="block">
        <Label>Book title</Label>
        <input
          value={title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          placeholder="e.g. The Practical Founder's Playbook"
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label hint="Name or brand that will appear on the cover.">Author / Brand</Label>
        <input
          value={author}
          onChange={(e) => onFieldChange("author", e.target.value)}
          placeholder="e.g. Jane Kim - Growth Studio"
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label hint="Be specific: the tighter the reader profile, the better the output.">
          Target reader
        </Label>
        <input
          value={targetAudience}
          onChange={(e) => onFieldChange("targetAudience", e.target.value)}
          placeholder="e.g. First-time founders raising a pre-seed round"
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label hint="Choose the main job this publication should do.">
          Purpose
        </Label>
        <select
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value as WizardPurpose)}
          className={inputClass}
        >
          <option value="">Select a purpose</option>
          {purposeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedPurpose ? (
          <p className="mt-2 text-[12px] text-[#8a867e]" style={{ fontFamily: "'Geist', sans-serif" }}>
            {selectedPurpose.description}
          </p>
        ) : null}
      </label>

      {purpose === "other" ? (
        <label className="block">
          <Label hint="Write the purpose as specifically as possible.">
            Other purpose
          </Label>
          <textarea
            value={purposeDetail}
            onChange={(e) => onFieldChange("purposeDetail", e.target.value)}
            placeholder="e.g. Turn my workshop notes into a credibility deck for conference attendees."
            rows={3}
            className={`${inputClass} resize-none leading-6`}
          />
        </label>
      ) : null}

      <div>
        <Label hint="This guides the first draft. You can still edit everything later.">
          Tone and manner
        </Label>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {toneOptions.map((option) => {
            const active = tone === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToneChange(option.value)}
                style={{
                  minHeight: "76px",
                  border: active ? "1px solid #17191d" : "1px solid #e1e4e8",
                  borderRadius: "7px",
                  background: active ? "#f7f8fa" : "#ffffff",
                  boxShadow: active ? "0 0 0 2px rgba(26,23,20,0.05)" : "none",
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1714",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  {option.label}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: "#8a867e",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
