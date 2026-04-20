"use client";

type ConceptStepProps = {
  title: string;
  targetAudience: string;
  goal: string;
  onTitleChange: (value: string) => void;
  onFieldChange: (field: "targetAudience" | "goal", value: string) => void;
};

export function ConceptStep({
  title,
  targetAudience,
  goal,
  onTitleChange,
  onFieldChange,
}: ConceptStepProps) {
  return (
    <div className="space-y-5">
      <label>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Ebook title
        </p>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Name this draft."
          className="mt-3 w-full rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>

      <label>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Who is this for?
        </p>
        <input
          value={targetAudience}
          onChange={(e) => onFieldChange("targetAudience", e.target.value)}
          placeholder="e.g. Early-career developers learning system design"
          className="mt-3 w-full rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>

      <label>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          What should they walk away with?
        </p>
        <input
          value={goal}
          onChange={(e) => onFieldChange("goal", e.target.value)}
          placeholder="e.g. Ability to design scalable APIs from scratch"
          className="mt-3 w-full rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>
    </div>
  );
}
