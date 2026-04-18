"use client";

type StyleStepProps = {
  tone: string;
  structureStyle: string;
  readerLevel: string;
  onFieldChange: (
    field: "tone" | "structureStyle" | "readerLevel",
    value: string,
  ) => void;
};

const tones = ["Expert", "Coach-like", "Practical", "Concise"];
const structures = ["Roadmap", "Checklist", "Step-by-step", "Concept-first"];
const levels = ["Beginner", "Practitioner", "Advanced"];

export function StyleStep({
  tone,
  structureStyle,
  readerLevel,
  onFieldChange,
}: StyleStepProps) {
  const renderPills = (
    label: string,
    value: string,
    options: string[],
    field: "tone" | "structureStyle" | "readerLevel",
  ) => (
    <div className="rounded-[28px] border border-line bg-white/80 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFieldChange(field, option)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === option
                ? "border-text bg-text text-white"
                : "border-line bg-[#fcfaf4] text-text hover:border-text"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {renderPills("Tone", tone, tones, "tone")}
      {renderPills(
        "Structure style",
        structureStyle,
        structures,
        "structureStyle",
      )}
      {renderPills("Reader level", readerLevel, levels, "readerLevel")}
    </div>
  );
}
