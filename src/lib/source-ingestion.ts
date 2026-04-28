import type { ProjectSource, SourceKind } from "@/types/project";

export const SOURCE_FILE_ACCEPT = ".md,.markdown,.txt,.csv,.json,.html,.htm,.xml,.pdf,.docx";

export type SourceIngestionErrorCode =
  | "unsupported_type"
  | "extraction_required"
  | "empty_source";

type SourceFileLike = {
  name: string;
  type?: string;
  text: () => Promise<string>;
};

type SourceFileDescriptor = {
  name: string;
  type?: string;
};

type SupportedSourceFile = {
  status: "supported";
  kind: Extract<SourceKind, "md" | "txt">;
  message: string;
  note: string;
};

type ExtractionRequiredSourceFile = {
  status: "extraction_required";
  kind: Extract<SourceKind, "pdf" | "docx">;
  message: string;
  note: string;
};

type UnsupportedSourceFile = {
  status: "unsupported_type";
  kind: null;
  message: string;
  note: string;
};

export type SourceFileSupport =
  | SupportedSourceFile
  | ExtractionRequiredSourceFile
  | UnsupportedSourceFile;

export class SourceIngestionError extends Error {
  code: SourceIngestionErrorCode;
  note: string;

  constructor(code: SourceIngestionErrorCode, message: string, note = "") {
    super(message);
    this.name = "SourceIngestionError";
    this.code = code;
    this.note = note;
  }
}

function extensionFor(fileName: string) {
  const ext = fileName.split(".").pop()?.trim().toLowerCase();
  return ext && ext !== fileName.toLowerCase() ? ext : "";
}

export function getSourceFileSupport(file: SourceFileDescriptor): SourceFileSupport {
  const ext = extensionFor(file.name);

  if (ext === "md" || ext === "markdown") {
    return {
      status: "supported",
      kind: "md",
      message: `${file.name} can be ingested.`,
      note: "Markdown files are read directly with File.text().",
    };
  }

  if (["txt", "csv", "json", "html", "htm", "xml"].includes(ext)) {
    return {
      status: "supported",
      kind: "txt",
      message: `${file.name} can be ingested.`,
      note: "Text-based files are read directly with File.text().",
    };
  }

  if (ext === "pdf") {
    return {
      status: "extraction_required",
      kind: "pdf",
      message: "PDF extraction is not connected yet. Use MD or TXT for now.",
      note: "Future PDF support should add an extraction adapter, likely backed by unpdf.",
    };
  }

  if (ext === "docx") {
    return {
      status: "extraction_required",
      kind: "docx",
      message: "DOCX extraction is not connected yet. Use MD or TXT for now.",
      note: "Future DOCX support should add an extraction adapter, likely backed by mammoth.",
    };
  }

  return {
    status: "unsupported_type",
    kind: null,
    message: `${file.name} is not a supported source file type.`,
    note: `Supported source files today: MD, TXT, CSV, JSON, HTML, and XML. PDF/DOCX need extraction first.`,
  };
}

export function isSupportedSourceFile(file: SourceFileDescriptor) {
  return getSourceFileSupport(file).status === "supported";
}

function toIngestionError(file: SourceFileDescriptor) {
  const support = getSourceFileSupport(file);

  if (support.status === "supported") return null;

  return new SourceIngestionError(support.status, support.message, support.note);
}

export async function buildProjectSourcesFromFiles(
  files: SourceFileLike[],
  options: { createId?: (index: number, file: SourceFileLike) => string } = {},
): Promise<ProjectSource[]> {
  const sources: ProjectSource[] = [];

  for (const [index, file] of files.entries()) {
    const ingestionError = toIngestionError(file);
    if (ingestionError) throw ingestionError;

    const support = getSourceFileSupport(file);
    if (support.status !== "supported") throw new SourceIngestionError(support.status, support.message, support.note);

    const content = (await file.text()).trim();
    if (!content) {
      throw new SourceIngestionError("empty_source", `${file.name} is empty.`);
    }

    sources.push({
      id: options.createId?.(index, file) ?? crypto.randomUUID(),
      kind: support.kind,
      name: file.name,
      content,
      excerpt: content.slice(0, 180),
    });
  }

  return sources;
}

export function formatSourcesForPrompt(sources: ProjectSource[], fallbackText = "") {
  if (sources.length === 0) return fallbackText.trim();

  return sources
    .map((source) => {
      const label = `${source.name} (${source.kind})`;
      return `# Source: ${label}\n\n${source.content.trim()}`;
    })
    .join("\n\n---\n\n");
}
