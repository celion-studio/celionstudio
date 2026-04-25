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

function precedingPaginationSpacerHeight(element: HTMLElement) {
  let height = 0;
  let sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.classList.contains("celion-pagination-break")) {
      height += numericStyleHeight(sibling);
    }
    sibling = sibling.previousElementSibling;
  }

  return height;
}

export function measureTopLevelBlocks(view: EditorView): MeasuredDomBlock[] {
  const rootRect = view.dom.getBoundingClientRect();
  const blocks: MeasuredDomBlock[] = [];

  view.state.doc.forEach((_node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    if (dom.closest(".celion-pagination-break, .celion-pagination-first-page")) return;

    const rect = dom.getBoundingClientRect();
    const style = window.getComputedStyle(dom);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    const paginationSpacerHeight = precedingPaginationSpacerHeight(dom);

    blocks.push({
      pos: offset,
      top: rect.top - rootRect.top - marginTop - paginationSpacerHeight,
      bottom: rect.bottom - rootRect.top + marginBottom - paginationSpacerHeight,
      element: dom,
    });
  });

  return blocks;
}
