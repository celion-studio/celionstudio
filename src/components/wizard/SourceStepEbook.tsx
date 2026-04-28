"use client";

import { FileText, Trash2, UploadCloud } from "lucide-react";
import {
  SOURCE_FILE_ACCEPT,
  SourceIngestionError,
  buildProjectSourcesFromFiles,
} from "@/lib/source-ingestion";
import type { ProjectSource } from "@/types/project";

type Props = {
  sources: ProjectSource[];
  sourceTextLength: number;
  onSourceFilesChange: (sources: ProjectSource[]) => void;
  onError: (message: string) => void;
};

export function SourceStepEbook({
  sources,
  sourceTextLength,
  onSourceFilesChange,
  onError,
}: Props) {
  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    try {
      const sources = await buildProjectSourcesFromFiles(files);
      onSourceFilesChange(sources);
    } catch (error) {
      if (error instanceof SourceIngestionError) {
        onError(error.note ? `${error.message} ${error.note}` : error.message);
        return;
      }

      onError("Could not read these source files.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center gap-2.5">
          <UploadCloud size={15} className="text-muted" />
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
            Upload source files
          </p>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "'Geist', sans-serif",
              color: "#b8b4aa",
              letterSpacing: "0.02em",
            }}
          >
            MD / TXT / CSV / JSON / HTML
          </span>
        </div>

        <label
          style={{
            display: "flex",
            minHeight: "220px",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            padding: "34px 24px",
            border: "1.5px dashed #dbd7cf",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = "#1a1714";
            event.currentTarget.style.background = "#f7f8fa";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "#dbd7cf";
            event.currentTarget.style.background = "#ffffff";
          }}
        >
          <UploadCloud size={24} style={{ color: "#8f969f" }} strokeWidth={1.7} />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
              color: "#1a1714",
            }}
          >
            Choose source files
          </span>
          <span
            style={{
              fontSize: "12.5px",
              fontFamily: "'Geist', sans-serif",
              color: "#858b93",
            }}
          >
            Markdown, plain text, CSV, JSON, HTML, or XML
          </span>
          <span
            style={{
              fontSize: "11.5px",
              fontFamily: "'Geist', sans-serif",
              color: "#b6bbc2",
            }}
          >
            PDF and DOCX can be selected, but extraction is not connected yet.
          </span>
          <input
            type="file"
            multiple
            accept={SOURCE_FILE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              void handleFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {sources.length > 0 ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
              Added
            </p>
            <button
              type="button"
              onClick={() => onSourceFilesChange([])}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: "1px solid #e1e4e8",
                borderRadius: "4px",
                background: "#fff",
                padding: "5px 8px",
                fontSize: "11.5px",
                fontFamily: "'Geist', sans-serif",
                color: "#858b93",
                cursor: "pointer",
              }}
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div className="space-y-1.5">
            {sources.map((source) => (
              <div
                key={source.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  border: "1px solid #e1e4e8",
                  borderRadius: "6px",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#4b515a",
                  fontFamily: "'Geist', sans-serif",
                }}
              >
                <FileText size={14} style={{ color: "#858b93", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {source.name}
                </span>
                <span style={{ marginLeft: "auto", color: "#b8b4aa", fontSize: "11px", textTransform: "uppercase" }}>
                  {source.kind}
                </span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: "8px", fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#b8b4aa" }}>
            {sourceTextLength.toLocaleString()} extracted characters
          </p>
        </div>
      ) : null}
    </div>
  );
}
