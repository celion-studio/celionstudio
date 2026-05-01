import assert from "node:assert/strict";
import test from "node:test";
import type { CelionEbookDocument } from "@/lib/ebook-document";
import {
  applyPreviewPageSpacing,
  buildPageSummariesFromDocument,
  buildPreviewFrameCss,
  estimatePreviewIframeHeight,
  normalizeEditorHtml,
  pickSelectableElement,
} from "./editor-preview";

const documentWithGenericPageTitle: CelionEbookDocument = {
  version: 1,
  title: "TOEFL Guide",
  size: { width: 559, height: 794, unit: "px" },
  themeCss: "",
  pages: [
    {
      id: "cover",
      index: 0,
      title: "Slide 1",
      role: "cover",
      html: `<section data-celion-page="cover" class="celion-page"><h1 data-celion-id="cover-title" data-role="title" data-editable="true">?�플 리딩 만점 가?�드</h1></section>`,
      css: `[data-celion-page="cover"] { width: 559px; height: 794px; overflow: hidden; }`,
      manifest: {
        editableElements: [
          {
            id: "cover-title",
            role: "title",
            type: "text",
            selector: `[data-celion-id="cover-title"]`,
            label: "Cover title",
            editableProps: ["text"],
          },
        ],
      },
      version: 1,
    },
    {
      id: "page-01",
      index: 1,
      title: "Prose Summary ?�복",
      role: "framework",
      html: `<section data-celion-page="page-01" class="celion-page"><p>본문</p></section>`,
      css: `[data-celion-page="page-01"] { width: 559px; height: 794px; overflow: hidden; }`,
      manifest: { editableElements: [] },
      version: 1,
    },
  ],
};

test("buildPageSummariesFromDocument uses real document titles before iframe load", () => {
  assert.deepEqual(buildPageSummariesFromDocument(documentWithGenericPageTitle), [
    { title: "?�플 리딩 만점 가?�드", eyebrow: "Cover" },
    { title: "Prose Summary ?�복", eyebrow: "Framework" },
  ]);
});

test("estimatePreviewIframeHeight reserves scroll room for all pages without iframe measurement", () => {
  assert.equal(estimatePreviewIframeHeight(10), 8160);
  assert.equal(estimatePreviewIframeHeight(0), 794);
});

test("pickSelectableElement prefers editable text under decorative overlays", () => {
  const page = {
    ...documentWithGenericPageTitle.pages[0],
    manifest: {
      editableElements: [
        {
          id: "cover-shape",
          role: "decorative-shape",
          type: "shape" as const,
          selector: `[data-celion-id="cover-shape"]`,
          label: "Cover shape",
          editableProps: ["backgroundColor" as const],
        },
        documentWithGenericPageTitle.pages[0].manifest.editableElements[0]!,
      ],
    },
  };

  assert.equal(pickSelectableElement(page, ["cover-shape", "cover-title"])?.id, "cover-title");
  assert.equal(pickSelectableElement(page, ["cover-shape"])?.id, "cover-shape");
});

test("normalizeEditorHtml migrates legacy page markup to slide markup", () => {
  const html = `<div class="page special" data-page="1">Legacy</div><style>.page { color: red; }</style>`;

  const normalized = normalizeEditorHtml(html);

  assert.match(normalized, /class="slide special"/);
  assert.match(normalized, /data-slide="1"/);
  assert.match(normalized, /\.slide\s*\{/);
  assert.doesNotMatch(normalized, /\bdata-page=/);
});

test("buildPreviewFrameCss keeps pages separated without page rings", () => {
  const css = buildPreviewFrameCss(28);

  assert.doesNotMatch(css, /\.slide::after/);
  assert.doesNotMatch(css, /border:\s*1px/);
  assert.doesNotMatch(css, /outline:\s*2px/);
});

test("applyPreviewPageSpacing separates pages without adding rings", () => {
  const pages = [
    { style: {} },
    { style: {} },
  ] as HTMLElement[];

  applyPreviewPageSpacing(pages, 28);

  assert.equal(pages[0].style.marginBottom, "28px");
  assert.equal(pages[1].style.marginBottom, "0");
  assert.equal(pages[0].style.marginLeft, "auto");
  assert.equal(pages[0].style.marginRight, "auto");
  assert.equal(pages[0].style.outline, "none");
  assert.equal(pages[0].style.boxShadow, "none");
});
