"use client";

import type { WizardPurpose } from "@/store/useProjectWizardStore";
import { Check, ChevronDown } from "lucide-react";

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
  const selectedPurpose = purposeOptions.find((option) => option.value === purpose);

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
        <details className="wizard-purpose-details">
          <summary
            className="wizard-purpose-trigger"
            data-selected={Boolean(selectedPurpose)}
          >
            <span>{selectedPurpose?.label ?? "Select a purpose"}</span>
            <ChevronDown size={15} className="wizard-purpose-chevron" />
          </summary>

          <div className="wizard-purpose-menu" role="listbox">
            {purposeOptions.map((option) => {
              const active = purpose === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className="wizard-purpose-option"
                  data-active={active}
                  role="option"
                  aria-selected={active}
                  onClick={(event) => {
                    onPurposeChange(option.value);
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  <span className="wizard-purpose-option-title">
                    {option.label}
                  </span>
                  {active ? <Check size={13} className="wizard-purpose-check" /> : null}
                </button>
              );
            })}
          </div>
        </details>
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
