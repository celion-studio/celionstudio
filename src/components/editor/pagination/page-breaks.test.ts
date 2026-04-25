import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_PAGINATION_STATE,
  getPaginationMetrics,
  measurePaginationBreaks,
  renderPaginationTemplate,
  samePaginationState,
} from "./page-breaks";
import type {
  CelionPaginationOptions,
  MeasuredBlock,
} from "./pagination-types";

const options: CelionPaginationOptions = {
  enabled: true,
  pageWidthPx: 720,
  pageHeightPx: 1000,
  pageGapPx: 40,
  paddingTopPx: 50,
  paddingRightPx: 60,
  paddingBottomPx: 70,
  paddingLeftPx: 60,
  headerHeightPx: 40,
  footerHeightPx: 40,
  headerText: "Header",
  footerText: "{page} / {total}",
};

function block(pos: number, top: number, bottom: number): MeasuredBlock {
  return { pos, top, bottom };
}

test("getPaginationMetrics computes the editable body area", () => {
  assert.deepEqual(getPaginationMetrics(options), {
    bodyTop: 90,
    bodyHeight: 800,
    pageStep: 1040,
  });
});

test("measurePaginationBreaks returns one page for empty content", () => {
  assert.deepEqual(measurePaginationBreaks([], options), EMPTY_PAGINATION_STATE);
});

test("measurePaginationBreaks keeps fitting content on one page", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 220),
    block(5, 240, 520),
    block(10, 540, 880),
  ], options);

  assert.equal(state.pageCount, 1);
  assert.equal(state.breaks.length, 0);
});

test("measurePaginationBreaks inserts a break before an overflowing block", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 500),
    block(5, 520, 940),
  ], options);

  assert.equal(state.pageCount, 2);
  assert.equal(state.breaks.length, 1);
  assert.equal(state.breaks[0]?.pos, 5);
  assert.equal(state.breaks[0]?.pageNumber, 1);
  assert.equal(state.breaks[0]?.spacerHeight, 610);
});

test("measurePaginationBreaks lets an oversized top-of-page block span visually", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 1800),
  ], options);

  assert.equal(state.breaks.length, 0);
  assert.equal(state.pageCount, 2);
});

test("measurePaginationBreaks keeps multiple overflow breaks stable", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 500),
    block(5, 520, 940),
    block(10, 1160, 1940),
    block(15, 2020, 3000),
  ], options);

  assert.equal(state.pageCount, 4);
  assert.deepEqual(
    state.breaks.map((item) => [item.pos, item.pageNumber]),
    [
      [5, 1],
      [10, 2],
      [15, 3],
    ],
  );
});

test("measurePaginationBreaks distinguishes the block after a break from a page-top block", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 500),
    block(5, 520, 940),
    block(10, 960, 1940),
  ], options);

  assert.equal(state.pageCount, 3);
  assert.deepEqual(
    state.breaks.map((item) => [item.pos, item.pageNumber]),
    [
      [5, 1],
      [10, 2],
    ],
  );
});

test("renderPaginationTemplate replaces page and total tokens", () => {
  assert.equal(renderPaginationTemplate("Page {page} of {total}", 2, 8), "Page 2 of 8");
});

test("samePaginationState compares page count and break geometry", () => {
  const state = measurePaginationBreaks([
    block(0, 90, 500),
    block(5, 520, 940),
  ], options);

  assert.equal(samePaginationState(state, { ...state, breaks: [...state.breaks] }), true);
  assert.equal(samePaginationState(state, { ...state, pageCount: 3 }), false);
  assert.equal(
    samePaginationState(state, {
      ...state,
      breaks: state.breaks.map((item) => ({ ...item, spacerHeight: item.spacerHeight + 1 })),
    }),
    false,
  );
});
