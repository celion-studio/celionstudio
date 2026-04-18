import { EmptyBuilderState } from "@/components/builder/EmptyBuilderState";

export function PreviewPanel({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  if (!html) {
    return <EmptyBuilderState />;
  }

  return (
    <div className="h-full bg-[#f7f2e8] p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              Live preview
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-[-0.03em] text-text">
              {title}
            </h2>
          </div>
          <div className="rounded-full border border-line bg-[#fcfaf4] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            HTML
          </div>
        </div>
        <iframe title="Ebook preview" srcDoc={html} className="h-full w-full border-0" />
      </div>
    </div>
  );
}
