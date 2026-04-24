"use client";

import { DynamicTiptapBookEditor } from "./DynamicTiptapBookEditor";
import type { TiptapBookDocument } from "@/lib/tiptap-document";
import type { PageFormat, PageSize } from "@/lib/page-format";

type DocumentEditorPanelProps = {
  title: string;
  document: unknown;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  toolbarHostId?: string;
  onChange(document: TiptapBookDocument): void;
  onPageCountChange?(pageCount: number): void;
};

export function DocumentEditorPanel(props: DocumentEditorPanelProps) {
  return <DynamicTiptapBookEditor {...props} />;
}
