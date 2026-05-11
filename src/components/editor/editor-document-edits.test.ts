import assert from "node:assert/strict";
import test from "node:test";
import type { CelionEditableElement, CelionEbookDocument } from "@/lib/ebook-document";
import type { RuntimeTextSelection } from "./editor-types";
import {
  appendScopedLayoutBoxToDocument,
  appendScopedLayoutTransformToDocument,
  appendScopedStyleToDocument,
  applyDocumentTextEdit,
  applyLegacyHtmlTextEdit,
  removeScopedLayoutFromDocument,
} from "./editor-document-edits";

const textElement: CelionEditableElement = {
  id: "cover-title",
  role: "title",
  type: "text",
  selector: `[data-celion-id="cover-title"]`,
  label: "Cover title",
  editableProps: ["text", "fontSize"],
};

const baseDocument: CelionEbookDocument = {
  version: 1,
  title: "Guide",
  size: { width: 559, height: 794, unit: "px" },
  themeCss: "",
  pages: [
    {
      id: "cover",
      index: 0,
      title: "Cover",
      role: "cover",
      html: `<section data-celion-page="cover"><h1 data-celion-id="cover-title">Old title</h1><p>Runtime note</p></section>`,
      css: `[data-celion-page="cover"] { width: 559px; height: 794px; overflow: hidden; }`,
      manifest: { editableElements: [textElement] },
      version: 1,
    },
    {
      id: "page-02",
      index: 1,
      title: "Second",
      role: "page",
      html: `<section data-celion-page="page-02"><p>Untouched</p></section>`,
      css: "",
      manifest: { editableElements: [] },
      version: 3,
    },
  ],
};

type FakeTextNode = {
  nodeType: number;
  textContent: string;
};

class FakeElement {
  tagName = "P";
  style: Record<string, string> = {};
  childNodes: FakeTextNode[];
  private attrs = new Map<string, string>();

  constructor(
    private value: string,
    private readonly onTextChange: (value: string) => void = () => {},
  ) {
    this.childNodes = [{ nodeType: 3, textContent: value }];
  }

  get textContent() {
    return this.value;
  }

  set textContent(value: string) {
    this.value = value;
    this.childNodes[0]!.textContent = value;
    this.onTextChange(value);
  }

  closest(selector: string) {
    if (selector === "script, style") return null;
    if (selector === "[data-celion-runtime-text-index]" && this.attrs.has("data-celion-runtime-text-index")) return this;
    return null;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [this];
  }

  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
}

class FakeDocument {
  body: { innerHTML: string };
  documentElement: { outerHTML: string };
  private selectorTarget: FakeElement | null;
  private slides: FakeElement[];

  constructor(html: string, selectorTarget: FakeElement | null, slides: FakeElement[] = []) {
    this.body = { innerHTML: html };
    this.selectorTarget = selectorTarget;
    this.slides = slides;
    this.documentElement = {
      get outerHTML() {
        return `<html><body>${html}</body></html>`;
      },
    };
  }

  querySelector(selector: string) {
    return selector === `[data-celion-id="cover-title"]` ? this.selectorTarget : null;
  }

  querySelectorAll(selector: string) {
    return selector === ".slide" ? this.slides : this.slides;
  }
}

test("applyDocumentTextEdit updates manifest text on one page and increments that page version", () => {
  const editable = new FakeElement("Old title", (value) => {
    fakeDocument.body.innerHTML = `<section data-celion-page="cover"><h1 data-celion-id="cover-title">${value}</h1><p>Runtime note</p></section>`;
  });
  const fakeDocument = new FakeDocument(baseDocument.pages[0]!.html, editable);

  const result = applyDocumentTextEdit({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    selectedRuntimeText: null,
    editValue: "New title",
    parseHtml: () => fakeDocument as unknown as Document,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value.pages[0]!.html, /New title/);
  assert.equal(result.value.pages[0]!.version, 2);
  assert.equal(result.value.pages[1]!.html, baseDocument.pages[1]!.html);
  assert.equal(result.value.pages[1]!.version, 3);
});

test("applyDocumentTextEdit updates runtime text outside the manifest", () => {
  (globalThis as unknown as { Node: { TEXT_NODE: number } }).Node = { TEXT_NODE: 3 };
  const runtimeElement = new FakeElement("Runtime note", (value) => {
    fakeDocument.body.innerHTML = `<section data-celion-page="cover"><h1 data-celion-id="cover-title">Old title</h1><p>${value}</p></section>`;
  });
  const fakeDocument = new FakeDocument(baseDocument.pages[0]!.html, null, [runtimeElement]);
  const runtimeSelection: RuntimeTextSelection = {
    mode: "document",
    pageId: "cover",
    pageIndex: 0,
    textIndex: 0,
  };

  const result = applyDocumentTextEdit({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: null,
    selectedRuntimeText: runtimeSelection,
    editValue: "Updated runtime note",
    parseHtml: () => fakeDocument as unknown as Document,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value.pages[0]!.html, /Updated runtime note/);
});

test("applyDocumentTextEdit preserves previous document snapshots for live patch undo", () => {
  const firstEditable = new FakeElement("Old title", (value) => {
    firstDocument.body.innerHTML = `<section data-celion-page="cover"><h1 data-celion-id="cover-title">${value}</h1><p>Runtime note</p></section>`;
  });
  const firstDocument = new FakeDocument(baseDocument.pages[0]!.html, firstEditable);

  const first = applyDocumentTextEdit({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    selectedRuntimeText: null,
    editValue: "First title",
    parseHtml: () => firstDocument as unknown as Document,
  });

  assert.equal(first.ok, true);
  if (!first.ok) return;

  const secondEditable = new FakeElement("First title", (value) => {
    secondDocument.body.innerHTML = `<section data-celion-page="cover"><h1 data-celion-id="cover-title">${value}</h1><p>Runtime note</p></section>`;
  });
  const secondDocument = new FakeDocument(first.value.pages[0]!.html, secondEditable);

  const second = applyDocumentTextEdit({
    document: first.value,
    selectedPageId: "cover",
    selectedElement: textElement,
    selectedRuntimeText: null,
    editValue: "Second title",
    parseHtml: () => secondDocument as unknown as Document,
  });

  assert.equal(second.ok, true);
  if (!second.ok) return;

  assert.match(baseDocument.pages[0]!.html, /Old title/);
  assert.equal(baseDocument.pages[0]!.version, 1);
  assert.match(first.value.pages[0]!.html, /First title/);
  assert.equal(first.value.pages[0]!.version, 2);
  assert.match(second.value.pages[0]!.html, /Second title/);
  assert.equal(second.value.pages[0]!.version, 3);
});

test("applyLegacyHtmlTextEdit handles runtime text selectors", () => {
  (globalThis as unknown as { Node: { TEXT_NODE: number } }).Node = { TEXT_NODE: 3 };
  const runtimeElement = new FakeElement("Legacy runtime", (value) => {
    fakeDocument.body.innerHTML = `<div class="slide"><p>${value}</p></div>`;
    fakeDocument.documentElement = {
      get outerHTML() {
        return `<html><body>${fakeDocument.body.innerHTML}</body></html>`;
      },
    };
  });
  const fakeDocument = new FakeDocument(`<div class="slide"><p>Legacy runtime</p></div>`, null, [runtimeElement]);

  const result = applyLegacyHtmlTextEdit({
    html: `<html><body><div class="slide"><p>Legacy runtime</p></div></body></html>`,
    selectedSelector: "runtime:0:0",
    editValue: "Edited legacy runtime",
    parseHtml: () => fakeDocument as unknown as Document,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value, /Edited legacy runtime/);
});

test("appendScopedStyleToDocument keeps style changes scoped to the selected page", () => {
  const result = appendScopedStyleToDocument({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    prop: "fontSize",
    value: "42px",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value.pages[0]!.css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ font-size: 42px; \}/);
  assert.equal(result.value.pages[0]!.version, 2);
});

test("appendScopedLayoutTransformToDocument stores drag movement as a scoped transform", () => {
  const result = appendScopedLayoutTransformToDocument({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    transform: "translate(24px, -12px)",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value.pages[0]!.css, /\/\* celion-layout:cover:cover-title \*\//);
  assert.match(result.value.pages[0]!.css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ transform: translate\(24px, -12px\); \}/);
  assert.match(result.value.pages[0]!.css, /\/\* \/celion-layout:cover:cover-title \*\//);
  assert.equal(result.value.pages[0]!.version, 2);
  assert.equal(result.value.pages[1]!.css, baseDocument.pages[1]!.css);
});

test("appendScopedLayoutTransformToDocument ignores runtime text pseudo selectors", () => {
  const runtimeElement: CelionEditableElement = {
    id: "runtime-text-cover-2",
    role: "text",
    type: "text",
    selector: "runtime-text:2",
    label: "Text",
    editableProps: ["text"],
  };

  const result = appendScopedLayoutTransformToDocument({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: runtimeElement,
    transform: "translate(24px, -12px)",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "not-applicable");
});

test("appendScopedLayoutBoxToDocument stores resize dimensions in one scoped rule", () => {
  const result = appendScopedLayoutBoxToDocument({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    width: "320px",
    height: "96px",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.match(result.value.pages[0]!.css, /\/\* celion-layout:cover:cover-title \*\//);
  assert.match(result.value.pages[0]!.css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ width: 320px; height: 96px; \}/);
  assert.equal(result.value.pages[0]!.version, 2);
});

test("layout edits merge into one override block per element", () => {
  const moved = appendScopedLayoutTransformToDocument({
    document: baseDocument,
    selectedPageId: "cover",
    selectedElement: textElement,
    transform: "translate(24px, -12px)",
  });
  assert.equal(moved.ok, true);
  if (!moved.ok) return;

  const resized = appendScopedLayoutBoxToDocument({
    document: moved.value,
    selectedPageId: "cover",
    selectedElement: textElement,
    width: "320px",
    height: "96px",
  });
  assert.equal(resized.ok, true);
  if (!resized.ok) return;

  const css = resized.value.pages[0]!.css;
  assert.equal((css.match(/celion-layout:cover:cover-title/g) ?? []).length, 2);
  assert.match(css, /\{ transform: translate\(24px, -12px\); width: 320px; height: 96px; \}/);
});

test("layout edits replace previous layout values without removing normal style rules", () => {
  const documentWithLegacyLayout: CelionEbookDocument = {
    ...baseDocument,
    pages: baseDocument.pages.map((page, index) => index === 0
      ? {
          ...page,
          css: `${page.css}
[data-celion-page="cover"] [data-celion-id="cover-title"] { transform: translate(1px, 2px); }
[data-celion-page="cover"] [data-celion-id="cover-title"] { color: #111111; }`,
        }
      : page),
  };

  const result = appendScopedLayoutTransformToDocument({
    document: documentWithLegacyLayout,
    selectedPageId: "cover",
    selectedElement: textElement,
    transform: "translate(10px, 20px)",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const css = result.value.pages[0]!.css;
  assert.doesNotMatch(css, /translate\(1px, 2px\)/);
  assert.match(css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ color: #111111; \}/);
  assert.match(css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ transform: translate\(10px, 20px\); \}/);
});

test("removeScopedLayoutFromDocument removes layout overrides and keeps normal style rules", () => {
  const documentWithLayout: CelionEbookDocument = {
    ...baseDocument,
    pages: baseDocument.pages.map((page, index) => index === 0
      ? {
          ...page,
          css: `${page.css}
/* celion-layout:cover:cover-title */
[data-celion-page="cover"] [data-celion-id="cover-title"] { transform: translate(10px, 20px); width: 320px; height: 96px; }
/* /celion-layout:cover:cover-title */
[data-celion-page="cover"] [data-celion-id="cover-title"] { color: #111111; }`,
        }
      : page),
  };

  const result = removeScopedLayoutFromDocument({
    document: documentWithLayout,
    selectedPageId: "cover",
    selectedElement: textElement,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const css = result.value.pages[0]!.css;
  assert.doesNotMatch(css, /celion-layout:cover:cover-title/);
  assert.doesNotMatch(css, /translate\(10px, 20px\)/);
  assert.match(css, /\[data-celion-page="cover"\] \[data-celion-id="cover-title"\] \{ color: #111111; \}/);
  assert.equal(result.value.pages[0]!.version, 2);
});
