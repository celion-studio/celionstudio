"use client";

import { Plus } from "lucide-react";

export function NewProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:opacity-90"
    >
      <Plus className="size-4" />
      New project
    </button>
  );
}

