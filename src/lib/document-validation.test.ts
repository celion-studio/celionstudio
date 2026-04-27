import assert from "node:assert/strict";
import test from "node:test";
import { validateTiptapBookDocument } from "./document-validation";

test("validateTiptapBookDocument accepts supported Tiptap documents", () => {
  const result = validateTiptapBookDocument({
    type: "tiptap-book",
    version: 1,
    pages: [
      {
        id: "page-1",
        doc: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
            { type: "paragraph", content: [{ type: "text", text: "Body", marks: [{ type: "bold" }] }] },
            { type: "image", attrs: { src: "https://example.com/cover.png", alt: "Cover" } },
          ],
        },
      },
    ],
  });

  assert.equal(result.ok, true);
});

test("validateTiptapBookDocument rejects unsupported nodes", () => {
  const result = validateTiptapBookDocument({
    type: "doc",
    content: [{ type: "iframe", attrs: { src: "https://example.com" } }],
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "unsupported_node");
});

test("validateTiptapBookDocument rejects malformed envelopes before normalization", () => {
  const arbitrary = validateTiptapBookDocument({ random: "payload" });
  assert.equal(arbitrary.ok, false);
  if (!arbitrary.ok) assert.equal(arbitrary.error.code, "invalid_document");

  const malformedPage = validateTiptapBookDocument({
    type: "tiptap-book",
    version: 1,
    pages: [{ id: "page-1", doc: { type: "paragraph" } }],
  });
  assert.equal(malformedPage.ok, false);
  if (!malformedPage.ok) assert.equal(malformedPage.error.code, "invalid_document");
});

test("validateTiptapBookDocument accepts raw Tiptap docs", () => {
  const result = validateTiptapBookDocument({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Draft" }] }],
  });

  assert.equal(result.ok, true);
});

test("validateTiptapBookDocument rejects inline image payloads", () => {
  const result = validateTiptapBookDocument({
    type: "doc",
    content: [{ type: "image", attrs: { src: "data:image/png;base64,iVBORw0KGgo=" } }],
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_image");
});
