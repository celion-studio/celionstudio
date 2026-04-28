"use client";

import { DynamicTiptapBookEditor } from "./DynamicTiptapBookEditor";
import type { TiptapBookDocument, TiptapBookLayout } from "@/lib/tiptap-document";
import type { PageFormat, PageSize } from "@/lib/page-format";

type DocumentEditorPanelProps = {
  title: string;
  document: unknown;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  toolbarHostId?: string;
  onChange(document: TiptapBookDocument): void;
  onPageCountChange?(pageCount: number): void;
  onLayoutChange?(layout: TiptapBookLayout): void;
  onSelectionAiRevise?(input: { selectedText: string; instruction: string }): Promise<string>;
  onImageUploadStateChange?(uploading: boolean): void;
};

export function DocumentEditorPanel(props: DocumentEditorPanelProps) {
  return <DynamicTiptapBookEditor {...props} />;
}
