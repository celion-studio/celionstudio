"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GuideRecord } from "@/types/guide";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  exported: "Exported",
  "in-progress": "In progress",
};

export function GuideList({ guides }: { guides: GuideRecord[] }) {
  if (guides.length === 0) return null;

  return (
    <div className="grid gap-2">
      {guides.map((guide) => (
        <Link
          key={guide.id}
          href={`/builder/${guide.id}`}
          className="group flex items-center justify-between rounded-2xl border border-[#E8E4DB] bg-white px-5 py-4 transition hover:border-[#1F1F1F]/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="flex min-w-0 items-center gap-4">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${guide.status === "exported" ? "bg-[#22c55e]" : "bg-[#E8E4DB]"}`} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[#1F1F1F]">{guide.title}</p>
              <p className="mt-0.5 text-[12px] text-[#71717a]">
                {guide.profile.targetAudience} · {guide.profile.tone} · {statusLabel[guide.status] ?? guide.status}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-4 pl-4">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#a1a1aa]">
                {guide.sources.length} {guide.sources.length === 1 ? "source" : "sources"}
              </p>
              <p className="mt-0.5 text-[11px] text-[#a1a1aa]">
                {new Date(guide.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <ArrowRight className="size-4 text-[#a1a1aa] transition group-hover:text-[#1F1F1F]" />
          </div>
        </Link>
      ))}
    </div>
  );
}
