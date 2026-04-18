export function EmptyBuilderState() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="max-w-xl rounded-[28px] border border-dashed border-line bg-white/70 p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          No HTML version yet
        </p>
        <h2 className="mt-3 font-display text-4xl tracking-[-0.03em] text-text">
          Generate the first draft when you are ready.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          Celion keeps the builder preview-first. Once a draft exists, revisions
          can target the full document or a specific `data-section` marker.
        </p>
      </div>
    </div>
  );
}
