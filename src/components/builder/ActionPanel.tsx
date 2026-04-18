"use client";

type ActionPanelProps = {
  hasHtml: boolean;
  sectionIds: string[];
  revisionPrompt: string;
  feedback: string;
  onRevisionPromptChange: (value: string) => void;
  onGenerateFirstDraft: () => void;
  onRegenerateDraft: () => void;
  onReviseDraft: () => void;
  onRegenerateSection: (sectionId: string) => void;
  onExportPdf: () => void;
  onFigmaHandoff: () => void;
};

export function ActionPanel({
  hasHtml,
  sectionIds,
  revisionPrompt,
  feedback,
  onRevisionPromptChange,
  onGenerateFirstDraft,
  onRegenerateDraft,
  onReviseDraft,
  onRegenerateSection,
  onExportPdf,
  onFigmaHandoff,
}: ActionPanelProps) {
  return (
    <aside className="flex h-full flex-col gap-4 border-l border-line bg-white/60 p-5">
      <div className="rounded-[24px] border border-line bg-[#fcfaf4] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          AI actions
        </p>
        <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={onGenerateFirstDraft}
            className="rounded-[18px] bg-text px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5"
          >
            Generate first draft
          </button>
          <button
            type="button"
            onClick={onRegenerateDraft}
            disabled={!hasHtml}
            className="rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-text transition hover:border-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Regenerate full draft
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Revision prompt
        </p>
        <textarea
          value={revisionPrompt}
          onChange={(event) => onRevisionPromptChange(event.target.value)}
          placeholder="Make the tone sharper, shorten the intro, make it feel more practical..."
          className="mt-4 min-h-[144px] w-full rounded-[20px] border border-line bg-[#fcfaf4] px-4 py-4 text-sm leading-7 text-text outline-none transition focus:border-text"
        />
        <button
          type="button"
          onClick={onReviseDraft}
          disabled={!hasHtml || !revisionPrompt.trim()}
          className="mt-4 w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-text transition hover:border-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Revise whole draft
        </button>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Section regeneration
        </p>
        <div className="mt-4 grid gap-2">
          {sectionIds.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-line px-4 py-4 text-sm text-muted">
              No `data-section` markers are available yet.
            </p>
          ) : (
            sectionIds.map((sectionId) => (
              <button
                key={sectionId}
                type="button"
                onClick={() => onRegenerateSection(sectionId)}
                className="rounded-[18px] border border-line bg-[#fcfaf4] px-4 py-3 text-left text-sm text-text transition hover:border-text"
              >
                Regenerate {sectionId}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-white p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Output
        </p>
        <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!hasHtml}
            className="rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-text transition hover:border-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={onFigmaHandoff}
            disabled={!hasHtml}
            className="rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-text transition hover:border-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy HTML for Figma
          </button>
        </div>
        {feedback ? (
          <p className="mt-4 rounded-[18px] bg-accentSoft px-4 py-3 text-sm leading-6 text-text">
            {feedback}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
