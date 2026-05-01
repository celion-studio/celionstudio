import assert from "node:assert/strict";
import test from "node:test";
import type { CelionEditableElement, CelionEbookDocument } from "@/lib/ebook-document";
import type { RuntimeTextSelection } from "./editor-types";
import {
  appendScopedStyleToDocument,
  applyDocumentTextEdit,
  applyLegacyHtmlTextEdit,
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
