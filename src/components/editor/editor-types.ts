import type { CelionEditableElement } from "@/lib/ebook-document";

export type RuntimeTextSelection = {
  mode: "document" | "legacy";
  pageId: string;
  pageIndex: number;
  textIndex: number;
};

export type ReadyPreviewDocument = {
  doc: Document;
  root: HTMLElement;
  body: HTMLBodyElement;
  head: HTMLHeadElement;
};

export type SelectedElementState = {
  text: string;
  pageId: string;
  element: CelionEditableElement | null;
  selector: string;
  runtimeText: RuntimeTextSelection | null;
};
