import assert from "node:assert/strict";
import test from "node:test";
import {
  getEbookPageCountForHtml,
  profileFromRow,
} from "./projects";

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
