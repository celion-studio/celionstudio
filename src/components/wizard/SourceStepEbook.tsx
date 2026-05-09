"use client";

import { FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import {
  SOURCE_FILE_ACCEPT,
  buildProjectSourcesFromFilesPartial,
} from "@/lib/source-ingestion";
import { CelionButton } from "@/components/ui/celion-controls";
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
          className="wizard-source-dropzone"
          data-has-sources={sources.length > 0}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(Array.from(event.dataTransfer.files ?? []));
          }}
        >
          <div className="wizard-source-header">
            <div className="wizard-source-title-row">
              <div className="wizard-source-icon">
                <UploadCloud size={15} />
              </div>
              <div className="wizard-source-copy">
                <p className="wizard-source-title">
                  Upload source files
                </p>
                <p className="wizard-source-subtitle">
                  Markdown, docx, csv, json, html
                </p>
              </div>
            </div>
            {sources.length > 0 ? (
              <div className="wizard-source-actions">
                <label
                  htmlFor={SOURCE_INPUT_ID}
                  className="wizard-source-upload-button"
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
              className="wizard-source-empty"
            >
              <div className="wizard-source-empty-icon">
                <UploadCloud size={20} strokeWidth={1.7} />
              </div>
              <span className="wizard-source-empty-title">
                Choose source files
              </span>
              <span className="wizard-source-empty-subtitle">
                Drop files here or browse from your computer
              </span>
            </label>
          ) : (
            <>
              <div className="wizard-file-list">
                <div className="wizard-file-list-head">
                  <p className="wizard-file-list-title">
                    Added files
                  </p>
                  <p className="wizard-file-list-count">
                    {sourceTextLength.toLocaleString()} extracted characters
                  </p>
                </div>

              <div className="wizard-file-list-body">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="wizard-file-row"
                  >
                    <FileText size={14} className="wizard-file-icon" />
                    <span className="wizard-file-name">
                      {source.name}
                    </span>
                    <span className="wizard-file-kind">
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
