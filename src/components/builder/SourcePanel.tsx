import type { GuideRecord } from "@/types/guide";

export function SourcePanel({ guide }: { guide: GuideRecord }) {
  return (
    <aside className="flex h-full flex-col gap-4 border-r border-line bg-white/60 p-5">
      <div className="rounded-[24px] border border-line bg-[#fcfaf4] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Status
        </p>
        <p className="mt-3 font-display text-3xl tracking-[-0.03em] text-text">
          {guide.status}
        </p>
        <p className="mt-3 text-sm leading-7 text-muted">
          This shell stores guide drafts locally for now. Database-backed
          versioning comes next.
        </p>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Guide profile
        </p>
        <dl className="mt-4 grid gap-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Audience
            </dt>
            <dd className="mt-1 text-text">{guide.profile.targetAudience}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Goal
            </dt>
            <dd className="mt-1 text-text">{guide.profile.goal}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Style
            </dt>
            <dd className="mt-1 text-text">
              {guide.profile.tone} / {guide.profile.structureStyle}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Sources
        </p>
        <div className="mt-4 space-y-3">
          {guide.sources.map((source) => (
            <div
              key={source.id}
              className="rounded-[20px] border border-line bg-[#fcfaf4] px-4 py-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {source.kind}
              </p>
              <p className="mt-2 text-sm font-medium text-text">{source.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{source.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
