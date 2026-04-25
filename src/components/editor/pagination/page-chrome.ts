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
  onDoubleClick?: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
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

export function createFirstPageWidget(
  options: CelionPaginationOptions,
  pageCount: number,
) {
  const root = document.createElement("div");
  root.className = "celion-pagination-first-page";
  root.contentEditable = "false";
  root.style.setProperty("--celion-page-height", `${options.pageHeightPx}px`);

  root.append(
    createChromeButton(
      "celion-pagination-header",
      options.headerText,
      options.onEditHeader,
    ),
    createChromeButton(
      "celion-pagination-footer",
      renderPaginationTemplate(options.footerText, 1, pageCount),
      options.onEditFooter,
    ),
  );

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
  root.style.setProperty("--celion-break-footer-top", `${pageBreak.footerTop}px`);
  root.style.setProperty("--celion-break-header-top", `${pageBreak.headerTop}px`);
  root.style.setProperty("--celion-break-next-footer-top", `${pageBreak.nextFooterTop}px`);

  root.append(
    createChromeButton(
      "celion-pagination-footer celion-pagination-break-footer",
      renderPaginationTemplate(options.footerText, pageBreak.pageNumber, pageCount),
      options.onEditFooter,
    ),
    createChromeButton(
      "celion-pagination-header celion-pagination-break-header",
      options.headerText,
      options.onEditHeader,
    ),
    createChromeButton(
      "celion-pagination-footer celion-pagination-break-next-footer",
      renderPaginationTemplate(options.footerText, pageBreak.pageNumber + 1, pageCount),
      options.onEditFooter,
    ),
  );

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

  const widgets: Decoration[] = [
    Decoration.widget(
      0,
      () => createFirstPageWidget(options, pagination.pageCount),
      { key: "celion-pagination-first-page", side: -1 },
    ),
  ];

  for (const pageBreak of pagination.breaks) {
    widgets.push(
      Decoration.widget(
        pageBreak.pos,
        () => createPageBreakWidget(options, pageBreak, pagination.pageCount),
        { key: pageBreak.key, side: -1 },
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
