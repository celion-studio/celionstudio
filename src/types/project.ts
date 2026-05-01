import type { CelionEbookDocument } from "@/lib/ebook-document";
import type { EbookStyle } from "@/lib/ebook-style";

export type { EbookStyle } from "@/lib/ebook-style";

export type ProjectStatus =
  | "draft"
  | "processing_sources"
  | "planning"
  | "plan_ready"
  | "generating"
  | "ready"
  | "revising"
  | "exported";

export const PROJECT_KIND_IDS = ["product"] as const;
export type ProjectKind = (typeof PROJECT_KIND_IDS)[number];

export const SOURCE_KIND_IDS = ["pasted_text", "pdf", "md", "txt", "docx"] as const;
export type SourceKind = (typeof SOURCE_KIND_IDS)[number];

export const DESIGN_MODE_IDS = ["text", "balanced", "visual"] as const;
export type DesignMode = (typeof DESIGN_MODE_IDS)[number];

export type ProjectSource = {
  id: string;
  kind: SourceKind;
  name: string;
  content: string;
  excerpt: string;
};

export type ProjectProfile = {
  author: string;
  targetAudience: string;
  purpose: string;
  designMode: DesignMode;
  tone: string;
  ebookStyle: EbookStyle | null;
  ebookHtml: string | null;
  ebookDocument: CelionEbookDocument | null;
  ebookPageCount: number;
  accentColor: string;
};

export type ProjectRecord = {
  id: string;
  kind: ProjectKind;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  sources: ProjectSource[];
  profile: ProjectProfile;
  revisionPrompt?: string;
};
