import type {
  CelionPaginationOptions,
  MeasuredBlock,
  PaginationMetrics,
  PaginationState,
} from "@/components/editor/pagination/pagination-types";

export const EMPTY_PAGINATION_STATE: PaginationState = {
  breaks: [],
  pageCount: 1,
};

export function getPaginationMetrics(
  options: CelionPaginationOptions,
): PaginationMetrics {
  const bodyTop = options.paddingTopPx + options.headerHeightPx;
  const bodyBottomInset = options.paddingBottomPx + options.footerHeightPx;

  return {
    bodyTop,
    bodyHeight: Math.max(
      options.pageHeightPx - bodyTop - bodyBottomInset,
      120,
    ),
    pageStep: options.pageHeightPx + options.pageGapPx,
  };
}

export function renderPaginationTemplate(
  template: string,
  pageNumber: number,
  totalPages: number,
) {
  return template
    .replaceAll("{page}", String(pageNumber))
    .replaceAll("{total}", String(totalPages));
}

export function measurePaginationBreaks(
  blocks: MeasuredBlock[],
  options: CelionPaginationOptions,
): PaginationState {
  if (!options.enabled) return EMPTY_PAGINATION_STATE;

  const { bodyTop, bodyHeight, pageStep } = getPaginationMetrics(options);
  const breaks: PaginationState["breaks"] = [];
  let pageNumber = 1;
  let insertedSpacerHeight = 0;
  let contentBottom = 0;

  for (const block of blocks) {
    const visualTop = block.top + insertedSpacerHeight;
    const visualBottom = block.bottom + insertedSpacerHeight;
    contentBottom = Math.max(contentBottom, visualBottom);
    const pageTop = (pageNumber - 1) * pageStep;
    const pageBodyTop = pageTop + bodyTop;
    const pageBodyBottom = pageBodyTop + bodyHeight;

    if (visualBottom <= pageBodyBottom) continue;

    const blockStartsAtCurrentPageTop = visualTop <= pageBodyTop + 2;
    if (blockStartsAtCurrentPageTop) {
      pageNumber += Math.max(
        1,
        Math.ceil((visualBottom - pageBodyBottom) / pageStep),
      );
      continue;
    }

    const nextPageTop = pageTop + options.pageHeightPx + options.pageGapPx;
    const spacerHeight = Math.round(nextPageTop + bodyTop - visualTop);
    const footerTop = Math.round(
      pageTop + options.pageHeightPx - options.paddingBottomPx - 28 - visualTop,
    );
    const headerTop = Math.round(nextPageTop + 14 - visualTop);
    const nextFooterTop = Math.round(
      nextPageTop + options.pageHeightPx - options.paddingBottomPx - 28 - visualTop,
    );

    breaks.push({
      key: `celion-page-break-${pageNumber}-${block.pos}-${spacerHeight}-${footerTop}-${headerTop}-${nextFooterTop}`,
      pos: block.pos,
      pageNumber,
      spacerHeight,
      footerTop,
      headerTop,
      nextFooterTop,
    });
    insertedSpacerHeight += spacerHeight;
    contentBottom = Math.max(contentBottom, block.bottom + insertedSpacerHeight);
    pageNumber += 1;
  }

  const measuredPages = Math.max(
    1,
    Math.ceil(Math.max(contentBottom - bodyTop, 0) / pageStep),
  );
  const pageCount = Math.max(pageNumber, measuredPages, breaks.length + 1);

  return { breaks, pageCount };
}

export function samePaginationState(
  a: PaginationState,
  b: PaginationState,
) {
  if (a.pageCount !== b.pageCount || a.breaks.length !== b.breaks.length) {
    return false;
  }

  return a.breaks.every((item, index) => {
    const other = b.breaks[index];
    return (
      other &&
      item.pos === other.pos &&
      item.pageNumber === other.pageNumber &&
      item.spacerHeight === other.spacerHeight &&
      item.footerTop === other.footerTop &&
      item.headerTop === other.headerTop &&
      item.nextFooterTop === other.nextFooterTop
    );
  });
}
