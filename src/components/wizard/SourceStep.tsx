"use client";

import { FileText, UploadCloud } from "lucide-react";

type SourceStepProps = {
  pastedText: string;
  fileNames: string[];
  error: string;
  onTextChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
};

export function SourceStep({
  pastedText,
  fileNames,
  error,
  onTextChange,
  onFilesChange,
}: SourceStepProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[28px] border border-line bg-white/80 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Paste source material
        </p>
        <h3 className="mt-3 font-display text-3xl leading-tight tracking-[-0.03em] text-text">
          Start with the knowledge you already own.
        </h3>
        <textarea
          value={pastedText}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Drop in rough notes, old drafts, transcripts, or any text you want to turn into a guide."
          className="mt-5 min-h-[280px] w-full rounded-[24px] border border-line bg-[#fcfaf4] px-5 py-4 text-sm leading-7 text-text outline-none transition focus:border-text"
        />
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-line bg-white/80 p-5">
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 size-5 text-text" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                Upload files
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Support: PDF, MD, TXT, DOCX. HWP is intentionally blocked.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-line bg-[#fcfaf4] px-5 py-8 text-center text-sm leading-7 text-muted transition hover:border-text">
            Choose files
            <input
              type="file"
              multiple
              accept=".pdf,.md,.txt,.docx"
              className="hidden"
              onChange={(event) =>
                onFilesChange(Array.from(event.target.files ?? []))
              }
            />
          </label>
        </div>

        <div className="rounded-[28px] border border-line bg-white/80 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Current intake
          </p>
          <div className="mt-4 space-y-3">
            {fileNames.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-line px-4 py-4 text-sm text-muted">
                No files selected yet.
              </div>
            ) : (
              fileNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-[20px] border border-line bg-[#fcfaf4] px-4 py-4 text-sm text-text"
                >
                  <FileText className="size-4" />
                  {name}
                </div>
              ))
            )}
          </div>
          {error ? (
            <p className="mt-4 rounded-[18px] bg-[#fff1e6] px-4 py-3 text-sm text-[#9b4c19]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
