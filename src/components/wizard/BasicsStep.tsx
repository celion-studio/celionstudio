"use client";

import { Check, ChevronDown } from "lucide-react";
import type { WizardPurpose, WizardTone } from "@/store/useProjectWizardStore";

const toneOptions: { value: WizardTone; label: string }[] = [
  {
    value: "preserve",
    label: "Keep source voice",
  },
  {
    value: "clear",
    label: "Clear and concise",
  },
  {
    value: "practical",
    label: "Practical",
  },
  {
    value: "editorial",
    label: "Editorial",
  },
  {
    value: "friendly",
    label: "Friendly",
  },
];

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
          <summary className="wizard-purpose-trigger">
            <span style={{ color: selectedPurpose ? "#17191d" : "#858b93" }}>
              {selectedPurpose?.label ?? "Select a purpose"}
            </span>
            <ChevronDown size={15} className="wizard-purpose-chevron" />
          </summary>

          <div role="listbox" className="wizard-purpose-menu">
            {purposeOptions.map((option) => {
              const active = purpose === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  className="wizard-purpose-option"
                  onClick={(event) => {
                    onPurposeChange(option.value);
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  <span className="wizard-purpose-option-title">{option.label}</span>
                  {active ? <Check size={13} style={{ color: "#24272c", marginTop: "1px" }} /> : null}
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

      <div>
        <Label>Tone and manner</Label>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {toneOptions.map((option) => {
            const active = tone === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToneChange(option.value)}
                className="wizard-tone-card"
                data-active={active}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#17191d",
                    fontFamily: "'Geist', sans-serif",
                  }}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
