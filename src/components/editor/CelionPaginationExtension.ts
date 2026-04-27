"use client";

import { Extension } from "@tiptap/core";
import { createCelionPaginationPlugin } from "@/components/editor/pagination/pagination-plugin";
export type { CelionPaginationOptions } from "@/components/editor/pagination/pagination-types";
import type { CelionPaginationOptions } from "@/components/editor/pagination/pagination-types";

export type CelionPaginationExtensionOptions = CelionPaginationOptions & {
  getOptions?: () => CelionPaginationOptions;
};

export const CelionPaginationExtension = Extension.create<CelionPaginationExtensionOptions>({
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
      headerHeightPx: 32,
      footerHeightPx: 32,
      headerType: "none",
      headerText: "",
      headerAlign: "center",
      footerType: "page",
      footerText: "{page}",
      footerAlign: "center",
      getOptions: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      createCelionPaginationPlugin(
        () => this.options.getOptions?.() ?? this.options,
      ),
    ];
  },
});
