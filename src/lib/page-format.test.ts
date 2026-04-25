import assert from "node:assert/strict";
import test from "node:test";
import {
  getPageFormatSpec,
  normalizePageSize,
} from "./page-format";

test("normalizePageSize keeps custom document pages portrait-oriented", () => {
  assert.deepEqual(
    normalizePageSize({ widthMm: 800, heightMm: 300 }),
    { widthMm: 300, heightMm: 800 },
  );
});

test("getPageFormatSpec previews wide custom sizes as portrait pages", () => {
  const spec = getPageFormatSpec("custom", { widthMm: 800, heightMm: 300 });
  const previewHeight = Math.round((spec.previewWidth * spec.heightMm) / spec.widthMm);

  assert.equal(spec.widthMm, 300);
  assert.equal(spec.heightMm, 800);
  assert.ok(spec.previewWidth < previewHeight);
});
