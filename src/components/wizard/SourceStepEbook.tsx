"use client";

import { FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import {
  SOURCE_FILE_ACCEPT,
  buildProjectSourcesFromFilesPartial,
} from "@/lib/source-ingestion";
import { CelionButton, getCelionButtonStyle } from "@/components/ui/celion-controls";
import type { WizardTone } from "@/store/useProjectWizardStore";
import type { ProjectSource } from "@/types/project";

const toneOptions: { value: WizardTone; label: string }[] = [
  {
    value: "preserve",
    label: "Keep source voice",
  },
  {
    value: "clear",
    label: "Clear and concise",
  },
  {
    value: "practical",
    label: "Practical",
  },
  {
    value: "editorial",
    label: "Editorial",
  },
  {
    value: "friendly",
    label: "Friendly",
  },
];

type Props = {
  sources: ProjectSource[];
  sourceTextLength: number;
  tone: WizardTone;
  onSourceFilesChange: (sources: ProjectSource[]) => void;
  onToneChange: (tone: WizardTone) => void;
  onError: (message: string) => void;
};

const SOURCE_INPUT_ID = "ebook-source-upload";

function sourceKindLabel(kind: ProjectSource["kind"]) {
  return kind.replace(/_/g, " ");
}

export function SourceStepEbook({
  sources,
  sourceTextLength,
  tone,
  onSourceFilesChange,
  onToneChange,
  onError,
}: Props) {
  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    try {
      const result = await buildProjectSourcesFromFilesPartial(files);
      if (result.sources.length > 0) {
        onSourceFilesChange([...sources, ...result.sources]);
      }
      if (result.errors.length > 0) {
        const skipped = result.errors
          .map(({ fileName, error }) => `${fileName}: ${error.message}`)
          .join(" ");
        onError(`Skipped ${result.errors.length} file${result.errors.length === 1 ? "" : "s"}. ${skipped}`);
      }
    } catch (error) {
      onError("Could not read these source files.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div
          style={{
            display: "flex",
            minHeight: "250px",
            flexDirection: "column",
            gap: "16px",
            padding: "18px",
            border: "1.5px dashed #dbd7cf",
            borderRadius: "6px",
            background: sources.length > 0 ? "#fbfbfa" : "#ffffff",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(Array.from(event.dataTransfer.files ?? []));
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = "#1a1714";
            event.currentTarget.style.background = "#f7f8fa";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "#dbd7cf";
            event.currentTarget.style.background = sources.length > 0 ? "#fbfbfa" : "#ffffff";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  border: "1px solid #e1e4e8",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UploadCloud size={15} style={{ color: "#69707a" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Geist', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#17191d",
                  }}
                >
                  Upload source files
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "12px",
                    fontFamily: "'Geist', sans-serif",
                    color: "#858b93",
                  }}
                >
                  Markdown, docx, csv, json, html
                </p>
              </div>
            </div>
            {sources.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <label
                  htmlFor={SOURCE_INPUT_ID}
                  style={getCelionButtonStyle({ size: "sm" })}
                >
                  <Plus size={13} />
                  Add more
                </label>
                <CelionButton
                  onClick={() => onSourceFilesChange([])}
                  size="sm"
                >
                  <Trash2 size={12} />
                  Clear
                </CelionButton>
              </div>
            ) : null}
          </div>

          <input
            id={SOURCE_INPUT_ID}
            type="file"
            multiple
            accept={SOURCE_FILE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              void handleFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />

          {sources.length === 0 ? (
            <label
              htmlFor={SOURCE_INPUT_ID}
              style={{
                minHeight: "168px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                border: "1px solid #eef0f2",
                borderRadius: "6px",
                background: "#fbfbfa",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "6px",
                  background: "#ffffff",
                  border: "1px solid #e1e4e8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UploadCloud size={20} style={{ color: "#69707a" }} strokeWidth={1.7} />
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily: "'Geist', sans-serif",
                  color: "#17191d",
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
                Drop files here or browse from your computer
              </span>
            </label>
          ) : (
            <>
              <div
                style={{
                  border: "1px solid #e1e4e8",
                  borderRadius: "6px",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 14px",
                    borderBottom: "1px solid #eef0f2",
                    background: "#ffffff",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Geist', sans-serif",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#17191d",
                    }}
                  >
                    Added files
                  </p>
                  <p style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#858b93" }}>
                    {sourceTextLength.toLocaleString()} extracted characters
                  </p>
                </div>

              <div style={{ padding: "8px" }}>
                {sources.map((source) => (
                  <div
                    key={source.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "10px",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      background: "#ffffff",
                      fontSize: "13px",
                      color: "#4b515a",
                      fontFamily: "'Geist', sans-serif",
                    }}
                  >
                    <FileText size={14} style={{ color: "#858b93", flexShrink: 0 }} />
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {source.name}
                    </span>
                    <span style={{ marginLeft: "auto", color: "#b8b4aa", fontSize: "11.5px", whiteSpace: "nowrap" }}>
                      {sourceKindLabel(source.kind)}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="wizard-label">
          <p className="wizard-label-text">Tone and manner</p>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {toneOptions.map((option) => {
            const active = tone === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToneChange(option.value)}
                className="wizard-tone-card"
                data-active={active}
              >
                <span className="wizard-tone-label">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
