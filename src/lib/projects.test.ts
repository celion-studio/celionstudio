import assert from "node:assert/strict";
import test from "node:test";
import {
  getEbookPageCountForHtml,
  profileFromRow,
} from "./projects";
import { claimRequestSlot, resetRequestThrottleForTests } from "./request-throttle";

test("getEbookPageCountForHtml reflects current Celion slide count", () => {
  assert.equal(getEbookPageCountForHtml("<div>No slides yet</div>"), 1);
  assert.equal(
    getEbookPageCountForHtml(`
      <div class="slide" data-slide="1"></div>
      <div class="slide" data-slide="2"></div>
      <div class="slide-footer"></div>
    `),
    2,
  );
});

test("profileFromRow normalizes stored ebook document JSON", () => {
  const profile = profileFromRow({
    projectId: "project-1",
    targetAudience: "Founders",
    tone: "Clear",
    author: "Ada",
    purpose: "Teach",
    designMode: "balanced",
    ebookStyle: "minimal",
    ebookHtml: "<div></div>",
    ebookDocument: {
      title: "Stored book",
      size: { width: 600, height: 800, unit: "px" },
      pages: [{ id: "cover", html: "<section></section>" }],
    },
    ebookPageCount: 1,
    accentColor: "#111111",
  });

  assert.equal(profile.ebookDocument?.version, 1);
  assert.equal(profile.ebookDocument?.title, "Stored book");
  assert.equal(profile.ebookDocument?.pages[0]?.id, "cover");
  assert.equal(profile.ebookDocument?.pages[0]?.title, "Page 1");
});

test("profileFromRow ignores empty or malformed ebook document JSON", () => {
  for (const ebookDocument of [{}, [], "null", { pages: [] }]) {
    const profile = profileFromRow({
      projectId: "project-1",
      targetAudience: "Founders",
      tone: "Clear",
      author: "Ada",
      purpose: "Teach",
      designMode: "balanced",
      ebookStyle: "minimal",
      ebookHtml: "<div></div>",
      ebookDocument,
      ebookPageCount: 1,
      accentColor: "#111111",
    });

    assert.equal(profile.ebookDocument, null);
  }
});

test("claimRequestSlot rejects concurrent requests for the same work", () => {
  resetRequestThrottleForTests();

  const first = claimRequestSlot("generate:user-1", {
    concurrencyKey: "generate:project-1",
    limit: 5,
    windowMs: 60_000,
  });
  assert.equal(first.ok, true);

  const second = claimRequestSlot("generate:user-1", {
    concurrencyKey: "generate:project-1",
    limit: 5,
    windowMs: 60_000,
  });
  assert.deepEqual(second, {
    ok: false,
    status: 409,
    message: "A generation request is already running. Please wait for it to finish.",
    retryAfterSeconds: 20,
  });

  if (first.ok) first.release();
  const third = claimRequestSlot("generate:user-1", {
    concurrencyKey: "generate:project-1",
    limit: 5,
    windowMs: 60_000,
  });
  assert.equal(third.ok, true);
  if (third.ok) third.release();
});

test("claimRequestSlot rate limits repeated requests by key", () => {
  resetRequestThrottleForTests();

  const config = {
    concurrencyKey: "plan:user-1",
    limit: 2,
    windowMs: 60_000,
  };

  const first = claimRequestSlot("plan:user-1", config);
  assert.equal(first.ok, true);
  if (first.ok) first.release();

  const second = claimRequestSlot("plan:user-1", config);
  assert.equal(second.ok, true);
  if (second.ok) second.release();

  const third = claimRequestSlot("plan:user-1", config);
  if (third.ok) {
    assert.fail("Expected the third request to be rate limited.");
  }
  assert.equal(third.status, 429);
});
