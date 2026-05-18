import type { CelionEditableElement } from "@/lib/ebook-document";

export type EditorMode = "view" | "edit";

export type RuntimeTextSelection = {
  mode: "document" | "legacy";
  slideId: string;
  slideIndex: number;
  textIndex: number;
};

export type InspectorStyleValues = Record<string, string>;

export type InspectorLayoutValues = {
  x: string;
  y: string;
  width: string;
  height: string;
};

export type ReadyPreviewDocument = {
  doc: Document;
  root: HTMLElement;
  body: HTMLBodyElement;
  head: HTMLHeadElement;
};

export type SelectedElementState = {
  text: string;
  slideId: string;
  element: CelionEditableElement | null;
  selector: string;
  runtimeText: RuntimeTextSelection | null;
  styleValues?: InspectorStyleValues;
};
