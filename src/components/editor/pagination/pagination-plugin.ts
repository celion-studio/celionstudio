import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  EMPTY_PAGINATION_STATE,
  measurePaginationBreaks,
  samePaginationState,
} from "@/components/editor/pagination/page-breaks";
import { buildPaginationDecorations } from "@/components/editor/pagination/page-chrome";
import { measureTopLevelBlocks } from "@/components/editor/pagination/page-measurement";
import type {
  CelionPaginationOptions,
  MeasuredBlock,
  PaginationState,
} from "@/components/editor/pagination/pagination-types";

export const paginationKey = new PluginKey<PaginationState>("celionPagination");

type PaginationRefreshMeta = {
  type: "refresh";
};

type PaginationMeta = PaginationState | PaginationRefreshMeta;

type ScrollAnchor = {
  container: HTMLElement;
  element: HTMLElement;
  top: number;
};

function getPaginationState(state: Parameters<typeof paginationKey.getState>[0]) {
  return paginationKey.getState(state) ?? EMPTY_PAGINATION_STATE;
}

function isPaginationRefreshMeta(meta: PaginationMeta): meta is PaginationRefreshMeta {
  return "type" in meta && meta.type === "refresh";
}

export function requestPaginationRefresh() {
  return { type: "refresh" } satisfies PaginationRefreshMeta;
}

function withPaginationVersion(
  state: PaginationState,
  version: number,
): PaginationState {
  return { ...state, version };
}

function findScrollContainer(element: HTMLElement) {
  let current = element.parentElement;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function captureScrollAnchor(
  view: Parameters<NonNullable<Plugin["spec"]["view"]>>[0],
  blocks: MeasuredBlock[],
): ScrollAnchor | null {
  const container = findScrollContainer(view.dom as HTMLElement);
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();
  let element: HTMLElement | null = null;

  for (const block of blocks) {
    const dom = view.nodeDOM(block.pos);
    const candidate =
      dom instanceof HTMLElement
        ? dom
        : dom?.parentElement instanceof HTMLElement
          ? dom.parentElement
          : null;
    if (!candidate) continue;

    const rect = candidate.getBoundingClientRect();
    if (rect.bottom >= containerRect.top + 8) {
      element = candidate;
      break;
    }
  }

  if (!element && blocks[0]) {
    const dom = view.nodeDOM(blocks[0].pos);
    element =
      dom instanceof HTMLElement
        ? dom
        : dom?.parentElement instanceof HTMLElement
          ? dom.parentElement
          : null;
  }
  if (!element) return null;

  return {
    container,
    element,
    top: element.getBoundingClientRect().top - containerRect.top,
  };
}

function restoreScrollAnchor(anchor: ScrollAnchor | null) {
  if (!anchor) return;

  window.requestAnimationFrame(() => {
    if (!anchor.element.isConnected) return;
    const containerRect = anchor.container.getBoundingClientRect();
    const nextTop = anchor.element.getBoundingClientRect().top - containerRect.top;
    anchor.container.scrollTop += nextTop - anchor.top;
  });
}

export function createCelionPaginationPlugin(
  getOptions: () => CelionPaginationOptions,
) {
  return new Plugin<PaginationState>({
    key: paginationKey,
    state: {
      init() {
        return EMPTY_PAGINATION_STATE;
      },
      apply(transaction, previous) {
        const meta = transaction.getMeta(paginationKey) as PaginationMeta | undefined;
        if (meta) {
          if (isPaginationRefreshMeta(meta)) {
            return withPaginationVersion(previous, previous.version + 1);
          }
          return withPaginationVersion(meta, previous.version);
        }
        if (!transaction.docChanged) return previous;

        return {
          breaks: previous.breaks
            .map((pageBreak) => ({
              ...pageBreak,
              pos: transaction.mapping.map(pageBreak.pos),
            }))
            .filter((pageBreak) => pageBreak.pos >= 0),
          pageCount: previous.pageCount,
          version: previous.version,
        };
      },
    },
    props: {
      decorations(state) {
        return buildPaginationDecorations(
          state,
          getOptions(),
          getPaginationState(state),
        );
      },
    },
    view(view) {
      let frame = 0;
      let disposed = false;
      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              schedule();
            });

      const schedule = () => {
        const options = getOptions();
        if (frame || disposed || !options.enabled) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (disposed) return;
          const latestOptions = getOptions();
          if (!latestOptions.enabled) return;

          const blocks = measureTopLevelBlocks(view);
          const next = measurePaginationBreaks(
            blocks,
            latestOptions,
          );
          const previous = getPaginationState(view.state);
          if (samePaginationState(previous, next)) return;

          latestOptions.onPageCountChange?.(next.pageCount);
          const anchor = captureScrollAnchor(view, blocks);
          const tr = view.state.tr
            .setMeta(paginationKey, withPaginationVersion(next, previous.version))
            .setMeta("addToHistory", false);
          view.dispatch(tr);
          restoreScrollAnchor(anchor);
        });
      };

      schedule();
      resizeObserver?.observe(view.dom);
      document.fonts?.ready.then(() => {
        schedule();
      });

      return {
        update(nextView, previousState) {
          const previousPagination = getPaginationState(previousState);
          const nextPagination = getPaginationState(nextView.state);
          if (
            previousState.doc === nextView.state.doc &&
            previousPagination.version === nextPagination.version
          ) {
            return;
          }

          schedule();
        },
        destroy() {
          disposed = true;
          resizeObserver?.disconnect();
          if (frame) window.cancelAnimationFrame(frame);
        },
      };
    },
  });
}
