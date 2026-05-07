"use client";

import type { WizardPurpose } from "@/store/useProjectWizardStore";

const purposeOptions: {
  value: Exclude<WizardPurpose, "">;
  label: string;
}[] = [
  {
    value: "sell",
    label: "Sell or promote",
  },
  {
    value: "teach",
    label: "Teach a method",
  },
  {
    value: "organize",
    label: "Organize expertise",
  },
  {
    value: "report",
    label: "Report or brief",
  },
  {
    value: "other",
    label: "Other",
  },
];

function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="wizard-label">
      <p className="wizard-label-text">{children}</p>
    </div>
  );
}

type BasicsStepProps = {
  title: string;
  author: string;
  targetAudience: string;
  purpose: WizardPurpose;
  purposeDetail: string;
  onFieldChange: (
    field: "title" | "author" | "targetAudience" | "purposeDetail",
    value: string,
  ) => void;
  onPurposeChange: (purpose: WizardPurpose) => void;
};

export function BasicsStep({
  title,
  author,
  targetAudience,
  purpose,
  purposeDetail,
  onFieldChange,
  onPurposeChange,
}: BasicsStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <label className="wizard-field">
          <Label>Book title</Label>
          <input
            value={title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            placeholder="e.g. The Practical Founder's Playbook"
            className="wizard-input"
          />
        </label>

        <label className="wizard-field">
          <Label>Author / Brand</Label>
          <input
            value={author}
            onChange={(e) => onFieldChange("author", e.target.value)}
            placeholder="e.g. Jane Kim - Growth Studio"
            className="wizard-input"
          />
        </label>
      </div>

      <label className="wizard-field">
        <Label>Target reader</Label>
        <input
          value={targetAudience}
          onChange={(e) => onFieldChange("targetAudience", e.target.value)}
          placeholder="e.g. First-time founders raising a pre-seed round"
          className="wizard-input"
        />
      </label>

      <div className="wizard-field">
        <Label>Purpose</Label>
        <select
          aria-label="Purpose"
          className="wizard-input wizard-select"
          value={purpose}
          onChange={(event) => onPurposeChange(event.target.value as WizardPurpose)}
        >
          <option value="">Select a purpose</option>
          {purposeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {purpose === "other" ? (
        <label className="wizard-field">
          <Label>Other purpose</Label>
          <textarea
            value={purposeDetail}
            onChange={(e) => onFieldChange("purposeDetail", e.target.value)}
            placeholder="e.g. Turn my workshop notes into a credibility deck for conference attendees."
            rows={3}
            className="wizard-input resize-none leading-6"
          />
        </label>
      ) : null}

    </div>
  );
}
