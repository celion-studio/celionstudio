"use client";

import { Extension } from "@tiptap/core";
import { createCelionPaginationPlugin } from "@/components/editor/pagination/pagination-plugin";
export type { CelionPaginationOptions } from "@/components/editor/pagination/pagination-types";
import type { CelionPaginationOptions } from "@/components/editor/pagination/pagination-types";

export const CelionPaginationExtension = Extension.create<CelionPaginationOptions>({
  name: "celionPagination",

  addOptions() {
    return {
      enabled: false,
      pageWidthPx: 720,
      pageHeightPx: 1080,
      pageGapPx: 36,
      paddingTopPx: 48,
      paddingRightPx: 58,
      paddingBottomPx: 58,
      paddingLeftPx: 58,
      headerHeightPx: 42,
      footerHeightPx: 42,
      headerText: "",
      footerText: "{page}",
    };
  },

  addProseMirrorPlugins() {
    return [createCelionPaginationPlugin(this.options)];
  },
});
