import type { ProjectSource, SourceKind } from "@/types/project";

export const SOURCE_FILE_ACCEPT = ".md,.markdown,.txt,.csv,.json,.html,.htm,.xml,.docx";

export type SourceIngestionErrorCode =
  | "unsupported_type"
  | "extraction_required"
  | "empty_source"
  | "read_failed";

type SourceFileLike = {
  name: string;
  type?: string;
  text: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
};

type SourceFileDescriptor = {
  name: string;
  type?: string;
};

export type SourceIngestionFileError = {
  fileName: string;
  error: SourceIngestionError;
};

type SupportedSourceFile = {
  status: "supported";
  kind: Extract<SourceKind, "md" | "txt" | "docx">;
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

type SourceBuildOptions = {
  createId?: (index: number, file: SourceFileLike) => string;
  extractDocxText?: (arrayBuffer: ArrayBuffer) => Promise<string>;
};

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

  if (ext === "docx") {
    return {
      status: "supported",
      kind: "docx",
      message: `${file.name} can be ingested.`,
      note: "DOCX files are extracted before being sent to the model.",
    };
  }

  if (ext === "pdf") {
    return {
      status: "extraction_required",
      kind: "pdf",
      message: "PDF extraction is not connected yet. Use MD, TXT, or DOCX for now.",
      note: "Future PDF support should add an extraction adapter, likely backed by unpdf.",
    };
  }

  return {
    status: "unsupported_type",
    kind: null,
    message: `${file.name} is not a supported source file type.`,
    note: `Supported source files today: MD, TXT, CSV, JSON, HTML, XML, and DOCX. PDF needs extraction first.`,
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
  options: SourceBuildOptions = {},
): Promise<ProjectSource[]> {
  const sources: ProjectSource[] = [];

  for (const [index, file] of files.entries()) {
    sources.push(await buildProjectSourceFromFile(file, index, options));
  }

  return sources;
}

export async function buildProjectSourcesFromFilesPartial(
  files: SourceFileLike[],
  options: SourceBuildOptions = {},
): Promise<{ sources: ProjectSource[]; errors: SourceIngestionFileError[] }> {
  const sources: ProjectSource[] = [];
  const errors: SourceIngestionFileError[] = [];

  for (const [index, file] of files.entries()) {
    try {
      sources.push(await buildProjectSourceFromFile(file, index, options));
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: normalizeSourceIngestionError(file, error),
      });
    }
  }

  return { sources, errors };
}

async function buildProjectSourceFromFile(
  file: SourceFileLike,
  index: number,
  options: SourceBuildOptions,
) {
  const ingestionError = toIngestionError(file);
  if (ingestionError) throw ingestionError;

  const support = getSourceFileSupport(file);
  if (support.status !== "supported") {
    throw new SourceIngestionError(support.status, support.message, support.note);
  }

  let content: string;
  try {
    content = (await extractTextFromFile(file, support.kind, options)).trim();
  } catch {
    throw new SourceIngestionError("read_failed", `Could not read ${file.name}.`);
  }

  if (!content) {
    throw new SourceIngestionError("empty_source", `${file.name} is empty.`);
  }

  return {
    id: options.createId?.(index, file) ?? crypto.randomUUID(),
    kind: support.kind,
    name: file.name,
    content,
    excerpt: content.slice(0, 180),
  };
}

async function extractTextFromFile(
  file: SourceFileLike,
  kind: SupportedSourceFile["kind"],
  options: SourceBuildOptions,
) {
  if (kind !== "docx") return file.text();
  if (!file.arrayBuffer) {
    throw new SourceIngestionError("read_failed", `Could not read ${file.name}.`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const extractDocxText = options.extractDocxText ?? extractDocxTextWithMammoth;
  return extractDocxText(arrayBuffer);
}

async function extractDocxTextWithMammoth(arrayBuffer: ArrayBuffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function normalizeSourceIngestionError(file: SourceFileDescriptor, error: unknown) {
  if (error instanceof SourceIngestionError) return error;

  return new SourceIngestionError("read_failed", `Could not read ${file.name}.`);
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
