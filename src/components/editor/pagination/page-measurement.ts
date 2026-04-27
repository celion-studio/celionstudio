import type { EditorView } from "@tiptap/pm/view";
import type { MeasuredBlock } from "@/components/editor/pagination/pagination-types";

type MeasuredDomBlock = MeasuredBlock & {
  element: HTMLElement;
};

function numericStyleHeight(element: Element) {
  if (!(element instanceof HTMLElement)) return 0;

  const styleHeight = Number.parseFloat(element.style.height);
  if (Number.isFinite(styleHeight)) return styleHeight;

  return element.offsetHeight;
}

export function measureTopLevelBlocks(view: EditorView): MeasuredDomBlock[] {
  const root = view.dom as HTMLElement;
  const rootRect = root.getBoundingClientRect();
  const blocks: MeasuredDomBlock[] = [];
  let siblingCursor: Element | null = root.firstElementChild;
  let paginationSpacerHeight = 0;

  view.state.doc.forEach((_node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    if (dom.closest(".celion-pagination-break, .celion-pagination-first-page")) return;

    if (dom.parentElement === root) {
      while (siblingCursor && siblingCursor !== dom) {
        if (siblingCursor.classList.contains("celion-pagination-break")) {
          paginationSpacerHeight += numericStyleHeight(siblingCursor);
        }
        siblingCursor = siblingCursor.nextElementSibling;
      }
      if (siblingCursor === dom) siblingCursor = siblingCursor.nextElementSibling;
    }

    const rect = dom.getBoundingClientRect();
    const style = window.getComputedStyle(dom);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;

    blocks.push({
      pos: offset,
      top: rect.top - rootRect.top - marginTop - paginationSpacerHeight,
      bottom: rect.bottom - rootRect.top + marginBottom - paginationSpacerHeight,
      element: dom,
    });
  });

  return blocks;
}
