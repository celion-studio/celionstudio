"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

type OutlineStepProps = {
  outline: string[];
  onOutlineChange: (outline: string[]) => void;
};

export function OutlineStep({ outline, onOutlineChange }: OutlineStepProps) {
  const update = (index: number, value: string) => {
    const next = [...outline];
    next[index] = value;
    onOutlineChange(next);
  };

  const remove = (index: number) => {
    onOutlineChange(outline.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...outline];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onOutlineChange(next);
  };

  const moveDown = (index: number) => {
    if (index === outline.length - 1) return;
    const next = [...outline];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onOutlineChange(next);
  };

  const add = () => {
    onOutlineChange([...outline, ""]);
  };

  return (
    <div className="space-y-2.5">
      {outline.map((chapter, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right font-display text-[11px] font-medium text-muted">
            {index + 1}
          </span>
          <input
            value={chapter}
            onChange={(e) => update(index, e.target.value)}
            placeholder={`Chapter ${index + 1}`}
            className="min-w-0 flex-1 rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-2.5 text-sm text-text outline-none transition focus:border-text"
          />
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="rounded-[8px] border border-line p-1.5 text-muted transition hover:border-text hover:text-text disabled:opacity-25"
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => moveDown(index)}
              disabled={index === outline.length - 1}
              className="rounded-[8px] border border-line p-1.5 text-muted transition hover:border-text hover:text-text disabled:opacity-25"
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={outline.length <= 1}
              className="rounded-[8px] border border-line p-1.5 text-muted transition hover:border-red-300 hover:text-red-500 disabled:opacity-25"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 rounded-[10px] border border-dashed border-line px-4 py-2.5 text-sm text-muted transition hover:border-text hover:text-text"
      >
        <Plus size={13} />
        Add chapter
      </button>
    </div>
  );
}
