"use client";

type ProfileStepProps = {
  targetAudience: string;
  goal: string;
  depth: string;
  onFieldChange: (field: "targetAudience" | "goal" | "depth", value: string) => void;
};

export function ProfileStep({
  targetAudience,
  goal,
  depth,
  onFieldChange,
}: ProfileStepProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <label className="rounded-[20px] border border-line bg-[#fdfcf8] p-6">
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Target audience
        </p>
        <input
          value={targetAudience}
          onChange={(event) => onFieldChange("targetAudience", event.target.value)}
          placeholder="Founders, creators, junior marketers..."
          className="mt-5 w-full rounded-[14px] border border-line bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>

      <label className="rounded-[20px] border border-line bg-[#fdfcf8] p-6">
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Goal
        </p>
        <input
          value={goal}
          onChange={(event) => onFieldChange("goal", event.target.value)}
          placeholder="Teach a workflow, package an offer, explain a framework..."
          className="mt-5 w-full rounded-[14px] border border-line bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        />
      </label>

      <label className="rounded-[20px] border border-line bg-[#fdfcf8] p-6">
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Depth
        </p>
        <select
          value={depth}
          onChange={(event) => onFieldChange("depth", event.target.value)}
          className="mt-5 w-full rounded-[14px] border border-line bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-text"
        >
          <option>Short and sharp</option>
          <option>Standard</option>
          <option>Deep dive</option>
        </select>
      </label>
    </div>
  );
}
