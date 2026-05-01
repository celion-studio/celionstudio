import assert from "node:assert/strict";
import test from "node:test";
import {
  getReadyPreviewDocument,
  measurePreviewFrameHeight,
  preparePreviewFrame,
} from "./editor-preview-frame";

class FakeTextElement {
  tagName = "P";
  style: Record<string, string> = {};
  childNodes = [{ nodeType: 3, textContent: "Text" }];
  private attrs = new Map<string, string>();

  get textContent() {
    return "Text";
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

class FakePage {
  style: Record<string, string> = {};
  offsetTop = 0;
  offsetHeight = 794;
  private attrs = new Map<string, string>();

  constructor(private readonly textElement = new FakeTextElement()) {}

  querySelectorAll(selector: string) {
    if (selector === "[data-text-editable]") return [];
    return [this.textElement];
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }

  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }

  runtimeText() {
    return this.textElement;
  }
}

class FakeDocument {
  documentElement = { style: {}, scrollHeight: 1200 };
  body = { style: {} };
  head = {
    appendChild: (element: FakeStyleElement) => {
      this.frameStyle = element;
    },
  };
  frameStyle: FakeStyleElement | null = null;

  constructor(private readonly pages: FakePage[]) {}

  getElementById(id: string) {
    return id === "celion-preview-frame-style" ? this.frameStyle : null;
  }

  createElement() {
    return new FakeStyleElement();
  }

  querySelectorAll(selector: string) {
    return selector === ".slide" ? this.pages : [];
  }
}

class FakeStyleElement {
  id = "";
  textContent = "";
}

test("preparePreviewFrame applies page spacing, no-ring frame CSS, and runtime text indexes", () => {
  (globalThis as unknown as { Node: { TEXT_NODE: number } }).Node = { TEXT_NODE: 3 };
  const pages = [new FakePage(), new FakePage()];
  pages[1]!.offsetTop = 822;
  const doc = new FakeDocument(pages);

  const result = preparePreviewFrame(
    { contentDocument: doc } as unknown as HTMLIFrameElement,
    { previewWidth: 640, pageGap: 28 },
  );

  assert.equal(result?.pages.length, 2);
  assert.equal((doc.body.style as Record<string, string>).minWidth, "640px");
  assert.equal(pages[0]!.style.marginBottom, "28px");
  assert.equal(pages[1]!.style.marginBottom, "0");
  assert.equal(pages[0]!.getAttribute("data-slide-index"), "0");
  assert.equal(pages[0]!.runtimeText().getAttribute("data-celion-runtime-text-index"), "0");
  assert.ok(doc.frameStyle?.textContent.includes("margin-bottom: 28px"));
  assert.ok(!doc.frameStyle?.textContent.includes("border: 1px"));
});

test("measurePreviewFrameHeight uses measured and deterministic page heights", () => {
  const pages = [new FakePage(), new FakePage()];
  pages[1]!.offsetTop = 822;
  const doc = new FakeDocument(pages);

  const height = measurePreviewFrameHeight(
    { contentDocument: doc } as unknown as HTMLIFrameElement,
    { pageHeight: 794, pageGap: 28 },
  );

  assert.equal(height, 1684);
});

test("getReadyPreviewDocument returns null before iframe content is ready", () => {
  assert.equal(getReadyPreviewDocument(null), null);
  assert.equal(getReadyPreviewDocument({ contentDocument: null } as unknown as HTMLIFrameElement), null);
});
