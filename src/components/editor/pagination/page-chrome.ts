import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  renderPaginationTemplate,
} from "@/components/editor/pagination/page-breaks";
import type {
  CelionPaginationOptions,
  PaginationBreak,
  PaginationState,
} from "@/components/editor/pagination/pagination-types";

function createChromeButton(
  className: string,
  label: string,
  align: "left" | "center" | "right",
  onDoubleClick?: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${className} celion-align-${align}`;
  button.textContent = label;
  button.contentEditable = "false";
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  if (onDoubleClick) {
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onDoubleClick();
    });
  }
  return button;
}

function resolveHeaderText(options: CelionPaginationOptions): string | null {
  if (options.headerType === "none") return null;
  if (options.headerType === "chapter") return options.headerText || null;
  return options.headerText || null;
}

function resolveFooterText(
  options: CelionPaginationOptions,
  pageNumber: number,
  pageCount: number,
): string | null {
  if (options.footerType === "none") return null;
  if (options.footerType === "page") return String(pageNumber);
  return renderPaginationTemplate(options.footerText, pageNumber, pageCount) || null;
}

export function createFirstPageWidget(
  options: CelionPaginationOptions,
  pageCount: number,
) {
  const root = document.createElement("div");
  root.className = "celion-pagination-first-page";
  root.contentEditable = "false";
  root.style.position = "absolute";
  root.style.inset = "0 0 auto";
  root.style.pointerEvents = "none";
  root.style.zIndex = "2";
  root.style.setProperty("--celion-page-height", `${options.pageHeightPx}px`);
  root.style.height = `${options.pageHeightPx}px`;

  const headerText = resolveHeaderText(options);
  const footerText = resolveFooterText(options, 1, pageCount);

  if (headerText !== null) {
    root.append(createChromeButton(
      "celion-pagination-header",
      headerText,
      options.headerAlign,
      options.headerType === "custom" ? options.onEditHeader : undefined,
    ));
  }
  if (footerText !== null) {
    root.append(createChromeButton(
      "celion-pagination-footer",
      footerText,
      options.footerAlign,
      options.footerType === "custom" ? options.onEditFooter : undefined,
    ));
  }

  return root;
}

export function createPageBreakWidget(
  options: CelionPaginationOptions,
  pageBreak: PaginationBreak,
  pageCount: number,
) {
  const root = document.createElement("div");
  root.className = "celion-pagination-break";
  root.contentEditable = "false";
  root.style.height = `${pageBreak.spacerHeight}px`;
  root.style.setProperty("--celion-page-height", `${options.pageHeightPx}px`);
  root.style.setProperty("--celion-page-gap", `${options.pageGapPx}px`);
  root.style.setProperty("--celion-page-pad-left", `${options.paddingLeftPx}px`);
  root.style.setProperty("--celion-page-pad-right", `${options.paddingRightPx}px`);
  root.style.setProperty("--celion-break-header-top", `${pageBreak.headerTop}px`);
  root.style.setProperty("--celion-break-next-footer-top", `${pageBreak.nextFooterTop}px`);
  root.style.setProperty("--celion-break-gap-top", `${pageBreak.gapTop}px`);

  const headerText = resolveHeaderText(options);
  const footerText = resolveFooterText(options, pageBreak.pageNumber + 1, pageCount);

  if (headerText !== null) {
    root.append(createChromeButton(
      "celion-pagination-header celion-pagination-break-header",
      headerText,
      options.headerAlign,
      options.headerType === "custom" ? options.onEditHeader : undefined,
    ));
  }
  if (footerText !== null) {
    root.append(createChromeButton(
      "celion-pagination-footer celion-pagination-break-next-footer",
      footerText,
      options.footerAlign,
      options.footerType === "custom" ? options.onEditFooter : undefined,
    ));
  }

  return root;
}

export function createHardBreakSpacer() {
  const spacer = document.createElement("span");
  spacer.className = "celion-br-decoration";
  spacer.contentEditable = "false";
  return spacer;
}

export function buildPaginationDecorations(
  state: EditorState,
  options: CelionPaginationOptions,
  pagination: PaginationState,
) {
  if (!options.enabled) return DecorationSet.empty;

  const chromeKey = `v${pagination.version}-p${pagination.pageCount}`;
  const widgets: Decoration[] = [
    Decoration.widget(
      0,
      () => createFirstPageWidget(options, pagination.pageCount),
      { key: `celion-pagination-first-page-${chromeKey}`, side: -1 },
    ),
  ];

  for (const pageBreak of pagination.breaks) {
    widgets.push(
      Decoration.widget(
        pageBreak.pos,
        () => createPageBreakWidget(options, pageBreak, pagination.pageCount),
        { key: `${pageBreak.key}-${chromeKey}`, side: -1 },
      ),
    );
  }

  state.doc.descendants((node, pos) => {
    if (node.type.name !== "hardBreak") return true;
    widgets.push(
      Decoration.widget(
        pos + 1,
        createHardBreakSpacer,
        { key: `celion-br-${pos}` },
      ),
    );
    return true;
  });

  return DecorationSet.create(state.doc, widgets);
}
