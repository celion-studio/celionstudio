"use client";

import Link from "next/link";
import type { GuideRecord } from "@/types/guide";

export function GuideList({ guides }: { guides: GuideRecord[] }) {
  if (guides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          No guides yet
        </p>
        <h2 className="mt-3 font-display text-4xl tracking-[-0.01em] text-text">
          Start with your own material.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
          Paste rough notes, upload a working draft, or combine several expert
          sources. The wizard will shape the guide direction before the builder
          opens.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {guides.map((guide) => (
        <Link
          key={guide.id}
          href={`/builder/${guide.id}`}
          className="group grid gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent md:grid-cols-[1.3fr_0.7fr]"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {guide.status}
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.01em] text-text">
              {guide.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              {guide.profile.goal} for {guide.profile.targetAudience}. Built in a{" "}
              {guide.profile.tone.toLowerCase()} tone with a{" "}
              {guide.profile.structureStyle.toLowerCase()} structure.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-line bg-surface-subtle p-4 text-sm text-muted">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Sources
              </p>
              <p className="mt-1 text-text">{guide.sources.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Reader level
              </p>
              <p className="mt-1 text-text">{guide.profile.readerLevel}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Updated
              </p>
              <p className="mt-1 text-text">
                {new Date(guide.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
