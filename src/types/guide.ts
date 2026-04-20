export type GuideStatus =
  | "draft"
  | "processing_sources"
  | "generating"
  | "ready"
  | "revising"
  | "exported";

export type SourceKind = "pasted_text" | "pdf" | "md" | "txt" | "docx";

export type GuideSource = {
  id: string;
  kind: SourceKind;
  name: string;
  content: string;
  excerpt: string;
};

export type GuideProfile = {
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  outline?: string[];
};

export type GuideRecord = {
  id: string;
  title: string;
  status: GuideStatus;
  createdAt: string;
  updatedAt: string;
  sources: GuideSource[];
  profile: GuideProfile;
  html: string;
  revisionPrompt?: string;
};
