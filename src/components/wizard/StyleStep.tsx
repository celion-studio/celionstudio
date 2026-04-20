"use client";

type StyleStepProps = {
  tone: string;
  structureStyle: string;
  readerLevel: string;
  depth: string;
  onFieldChange: (
    field: "tone" | "structureStyle" | "readerLevel" | "depth",
    value: string,
  ) => void;
};

const tones = ["Expert", "Coach-like", "Practical", "Concise"];
const structures = ["Roadmap", "Checklist", "Step-by-step", "Concept-first"];
const levels = ["Beginner", "Practitioner", "Advanced"];
const depths = ["Short and sharp", "Standard", "Deep dive"];

export function StyleStep({
  tone,
  structureStyle,
  readerLevel,
  depth,
  onFieldChange,
}: StyleStepProps) {
  const renderPills = (
    label: string,
    value: string,
    options: string[],
    field: "tone" | "structureStyle" | "readerLevel" | "depth",
  ) => (
    <div>
      <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onFieldChange(field, option)}
            className={`rounded-[8px] border px-4 py-2 text-sm transition ${value === option
              ? "border-text bg-text text-white"
              : "border-line bg-white text-text hover:border-text"
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {renderPills("Tone", tone, tones, "tone")}
      {renderPills("Structure style", structureStyle, structures, "structureStyle")}
      {renderPills("Reader level", readerLevel, levels, "readerLevel")}
      {renderPills("Depth", depth, depths, "depth")}
    </div>
  );
}
