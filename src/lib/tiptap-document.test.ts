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
            src: "https://cdn.example.com/cover.png",
            alt: "Cover",
          },
        },
      ],
    },
  });

  assert.match(html, /<figure data-align="center"><img src="https:\/\/cdn.example.com\/cover.png" alt="Cover" loading="eager" decoding="sync" crossorigin="anonymous" \/><\/figure>/);
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
            src: "https://cdn.example.com/cover.png",
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
            src: "https://cdn.example.com/cover.png",
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
            src: "https://cdn.example.com/cover.png",
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

test("tiptapDocumentToHtml omits page chrome until export has real pagination", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "tiptap-book",
      version: 1,
      layout: {
        headerType: "custom",
        headerText: "Celion Proof",
        headerAlign: "right",
        footerType: "page",
        footerText: "{page} / {total}",
        footerAlign: "center",
      },
      pages: [
        {
          id: "page-1",
          doc: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Ready" }] }],
          },
        },
      ],
    },
  });

  assert.doesNotMatch(html, /page-header/);
  assert.doesNotMatch(html, /page-footer/);
});

test("tiptapDocumentToHtml renders hard breaks and code blocks", () => {
  const html = tiptapDocumentToHtml({
    title: "Export",
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line one" },
            { type: "hardBreak" },
            { type: "text", text: "Line two" },
          ],
        },
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const value = 1 < 2;" }],
        },
      ],
    },
  });

  assert.match(html, /Line one<br \/>Line two/);
  assert.match(html, /<pre><code>const value = 1 &lt; 2;<\/code><\/pre>/);
});
