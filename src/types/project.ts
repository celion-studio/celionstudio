export type ProjectStatus =
  | "draft"
  | "processing_sources"
  | "planning"
  | "plan_ready"
  | "generating"
  | "ready"
  | "revising"
  | "exported";

export type ProjectKind = "product" | "document";

export type EbookStyle =
  | "minimal"
  | "editorial"
  | "neo-brutalism"
  | "bold"
  | "elegant";

export type SourceKind = "pasted_text" | "pdf" | "md" | "txt" | "docx";

export type DesignMode = "text" | "balanced" | "visual";
export type PageFormat =
  | "ebook"
  | "kindle"
  | "tablet"
  | "mobile"
  | "a5"
  | "a4"
  | "a3"
  | "a2"
  | "custom";

export type PageSize = {
  widthMm: number;
  heightMm: number;
};

export type ProjectSource = {
  id: string;
  kind: SourceKind;
  name: string;
  content: string;
  excerpt: string;
};

export type PlanChapter = {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
};

export type ProjectPlan = {
  hook: string;
  chapters: PlanChapter[];
};

export type ProjectDocumentPayload = unknown;

export type ProjectProfile = {
  author: string;
  targetAudience: string;
  coreMessage: string;
  designMode: DesignMode;
  tone: string;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  plan: ProjectPlan | null;
  document: ProjectDocumentPayload;
  ebookStyle: EbookStyle | null;
  ebookHtml: string | null;
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

