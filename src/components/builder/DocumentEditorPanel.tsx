"use client";

import type { PartialBlock } from "@blocknote/core";
import { DynamicBlockNoteEditor } from "./DynamicBlockNoteEditor";
import type { PageFormat, PageSize } from "@/lib/page-format";

type DocumentEditorPanelProps = {
  title: string;
  blocks: unknown;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  onChange(blocks: PartialBlock[]): void;
};

export function DocumentEditorPanel(props: DocumentEditorPanelProps) {
  return <DynamicBlockNoteEditor {...props} />;
}
