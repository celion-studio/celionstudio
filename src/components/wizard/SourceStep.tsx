"use client";

import { FileText, UploadCloud } from "lucide-react";

type SourceStepProps = {
  pastedText: string;
  fileNames: string[];
  onTextChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
};

export function SourceStep({
  pastedText,
  fileNames,
  onTextChange,
  onFilesChange,
}: SourceStepProps) {
  const hasPastedText = pastedText.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
          Paste source material
        </p>
        <textarea
          value={pastedText}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste notes or transcript."
          className="mt-3 min-h-[280px] w-full rounded-[10px] border border-line bg-[#fdfcf8] px-5 py-4 text-sm leading-7 text-text outline-none transition focus:border-text"
        />
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 size-5 text-text" />
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
                Upload files
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">PDF, MD, TXT, DOCX.</p>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-line bg-[#fdfcf8] px-5 py-8 text-center text-sm leading-7 text-muted transition hover:border-text">
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

        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
            Current intake
          </p>
          <div className="mt-4 space-y-2">
            {!hasPastedText && fileNames.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-line px-4 py-4 text-sm text-muted">
                Nothing added yet.
              </div>
            ) : (
              <>
                {hasPastedText ? (
                  <div className="flex items-center gap-3 rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text">
                    <FileText className="size-4" />
                    Pasted notes
                  </div>
                ) : null}
                {fileNames.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-[10px] border border-line bg-[#fdfcf8] px-4 py-3 text-sm text-text"
                  >
                    <FileText className="size-4" />
                    {name}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
