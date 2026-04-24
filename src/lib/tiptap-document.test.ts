import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTiptapBookDocument,
  tiptapDocumentToHtml,
  textFromDoc,
} from "./tiptap-document";

test("normalizeTiptapBookDocument preserves Tiptap pages", () => {
  const book = normalizeTiptapBookDocument({
    type: "tiptap-book",
    version: 1,
    pages: [
      {
        id: "page-a",
        doc: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
        },
      },
    ],
  });

  assert.equal(book.type, "tiptap-book");
  assert.equal(book.pages[0]?.id, "page-a");
  assert.equal(textFromDoc(book.pages[0]!.doc), "Hello");
});

test("normalizeTiptapBookDocument migrates legacy block arrays", () => {
  const book = normalizeTiptapBookDocument([
    { type: "heading", props: { level: 1 }, content: "Title" },
    { type: "paragraph", content: "Body" },
  ]);

  assert.equal(book.pages[0]?.doc.content?.[0]?.type, "heading");
  assert.equal(book.pages[0]?.doc.content?.[0]?.attrs?.level, 1);
  assert.equal(textFromDoc(book.pages[0]!.doc), "Title\nBody");
});

test("tiptapDocumentToHtml renders Tiptap JSON", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Export" }] },
        { type: "paragraph", content: [{ type: "text", text: "Ready" }] },
      ],
    },
  });

  assert.match(html, /<h1>Export<\/h1>/);
  assert.match(html, /<p>Ready<\/p>/);
});

test("tiptapDocumentToHtml renders image nodes", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "data:image/png;base64,abc",
            alt: "Cover",
          },
        },
      ],
    },
  });

  assert.match(html, /<figure data-align="center"><img src="data:image\/png;base64,abc" alt="Cover" \/><\/figure>/);
});

test("tiptapDocumentToHtml preserves image sizing and crop mode", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "data:image/png;base64,abc",
            alt: "Cover",
            width: 420,
            height: 260,
            fit: "crop",
          },
        },
      ],
    },
  });

  assert.match(html, /data-fit="crop"/);
  assert.match(html, /style="width:420px;height:260px;object-fit:cover"/);
});

test("tiptapDocumentToHtml preserves image alignment", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "data:image/png;base64,abc",
            alt: "Cover",
            align: "right",
            width: 240,
          },
        },
      ],
    },
  });

  assert.match(html, /<figure data-align="right">/);
  assert.match(html, /style="width:240px"/);
});

test("tiptapDocumentToHtml renders media text blocks", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        {
          type: "mediaText",
          attrs: {
            src: "data:image/png;base64,abc",
            alt: "Cover",
            imageSide: "left",
            imageWidth: 40,
          },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Side copy" }],
            },
          ],
        },
      ],
    },
  });

  assert.match(html, /class="media-text"/);
  assert.match(html, /--media-image-width:40%/);
  assert.match(html, /<p>Side copy<\/p>/);
});
