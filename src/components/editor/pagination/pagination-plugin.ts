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
  PaginationState,
} from "@/components/editor/pagination/pagination-types";

export const paginationKey = new PluginKey<PaginationState>("celionPagination");

function getPaginationState(state: Parameters<typeof paginationKey.getState>[0]) {
  return paginationKey.getState(state) ?? EMPTY_PAGINATION_STATE;
}

export function createCelionPaginationPlugin(
  options: CelionPaginationOptions,
) {
  return new Plugin<PaginationState>({
    key: paginationKey,
    state: {
      init() {
        return EMPTY_PAGINATION_STATE;
      },
      apply(transaction, previous) {
        const meta = transaction.getMeta(paginationKey) as PaginationState | undefined;
        if (meta) return meta;
        if (!transaction.docChanged) return previous;

        return {
          breaks: previous.breaks
            .map((pageBreak) => ({
              ...pageBreak,
              pos: transaction.mapping.map(pageBreak.pos),
            }))
            .filter((pageBreak) => pageBreak.pos >= 0),
          pageCount: previous.pageCount,
        };
      },
    },
    props: {
      decorations(state) {
        return buildPaginationDecorations(
          state,
          options,
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
        if (frame || disposed || !options.enabled) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (disposed) return;

          const next = measurePaginationBreaks(
            measureTopLevelBlocks(view),
            options,
          );
          const previous = getPaginationState(view.state);
          if (samePaginationState(previous, next)) return;

          options.onPageCountChange?.(next.pageCount);
          const tr = view.state.tr
            .setMeta(paginationKey, next)
            .setMeta("addToHistory", false);
          view.dispatch(tr);
        });
      };

      schedule();
      resizeObserver?.observe(view.dom);
      document.fonts?.ready.then(() => {
        schedule();
      });

      return {
        update() {
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
