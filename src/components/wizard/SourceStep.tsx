"use client";

import { FileText, Trash2, UploadCloud } from "lucide-react";
import { SOURCE_FILE_ACCEPT } from "@/lib/source-ingestion";

type SourceStepProps = {
  fileNames: string[];
  onFilesChange: (files: File[]) => void;
};

export function SourceStep({ fileNames, onFilesChange }: SourceStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center gap-2.5">
          <UploadCloud size={15} className="text-muted" />
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
            Upload source document
          </p>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "'Geist', sans-serif",
              color: "#b8b4aa",
              letterSpacing: "0.02em",
            }}
          >
            MD / TXT
          </span>
        </div>

        <label
          style={{
            display: "flex",
            minHeight: "210px",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            padding: "34px 24px",
            border: "1.5px dashed #dbd7cf",
            borderRadius: "8px",
            background: "#fdfcf8",
            cursor: "pointer",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLLabelElement;
            el.style.borderColor = "#1a1714";
            el.style.background = "#f7f8fa";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLLabelElement;
            el.style.borderColor = "#dfe3e7";
            el.style.background = "#ffffff";
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
            Choose documents
          </span>
          <span
            style={{
              fontSize: "12.5px",
              fontFamily: "'Geist', sans-serif",
              color: "#858b93",
            }}
          >
            or drag and drop files here
          </span>
          <span
            style={{
              fontSize: "11.5px",
              fontFamily: "'Geist', sans-serif",
              color: "#b6bbc2",
            }}
          >
            PDF/DOCX extraction needs the next file-ingestion slice
          </span>
          <input
            type="file"
            multiple
            accept={SOURCE_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>

      {fileNames.length > 0 ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">
              Added
            </p>
            <button
              type="button"
              onClick={() => onFilesChange([])}
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
            {fileNames.map((name) => (
              <div
                key={name}
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
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
