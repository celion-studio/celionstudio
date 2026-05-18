import type { CelionSlideDocument } from "@/lib/slide-document";
import type { SlideStyle } from "@/lib/slide-style";

export type { SlideStyle } from "@/lib/slide-style";

export type ProjectStatus =
  | "draft"
  | "processing_sources"
  | "planning"
  | "plan_ready"
  | "generating"
  | "ready"
  | "revising"
  | "exported";

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
  slideStyle: SlideStyle | null;
  slideHtml: string | null;
  slideDocument: CelionSlideDocument | null;
  slideCount: number;
  accentColor: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sources: ProjectSource[];
  profile: ProjectProfile;
};
