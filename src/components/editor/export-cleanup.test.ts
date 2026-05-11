import assert from "node:assert/strict";
import test from "node:test";
import { clearEditorSelectionForExport, hideEditorChromeForExport, stripEditorMetadataFromHtml } from "./export-cleanup";

class FakeSelectedElement {
  style = {
    outline: "",
    outlineOffset: "",
  };

  private attributes = new Map<string, string>();

  constructor(selectedValue: string | null, outline: string, outlineOffset: string) {
    if (selectedValue !== null) {
      this.attributes.set("data-selected", selectedValue);
    }
    this.style.outline = outline;
    this.style.outlineOffset = outlineOffset;
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

test("clearEditorSelectionForExport removes selected markers and restores them", () => {
  const selected = new FakeSelectedElement("true", "2px solid #6366f1", "2px");

  const restore = clearEditorSelectionForExport([selected]);

  assert.equal(selected.getAttribute("data-selected"), null);
  assert.equal(selected.style.outline, "none");
  assert.equal(selected.style.outlineOffset, "0");

  restore();

  assert.equal(selected.getAttribute("data-selected"), "true");
  assert.equal(selected.style.outline, "2px solid #6366f1");
  assert.equal(selected.style.outlineOffset, "2px");
});

test("clearEditorSelectionForExport removes hover markers and restores them", () => {
  const hovered = new FakeSelectedElement(null, "1px dashed #0ea5e9", "2px");
  hovered.setAttribute("data-celion-hovered", "text");

  const restore = clearEditorSelectionForExport([hovered]);

  assert.equal(hovered.getAttribute("data-celion-hovered"), null);
  assert.equal(hovered.style.outline, "none");
  assert.equal(hovered.style.outlineOffset, "0");

  restore();

  assert.equal(hovered.getAttribute("data-celion-hovered"), "text");
  assert.equal(hovered.style.outline, "1px dashed #0ea5e9");
  assert.equal(hovered.style.outlineOffset, "2px");
});

test("hideEditorChromeForExport hides editor-only controls and restores them", () => {
  const handle = { style: { display: "block" } };

  const restore = hideEditorChromeForExport([handle]);

  assert.equal(handle.style.display, "none");

  restore();

  assert.equal(handle.style.display, "block");
});

test("stripEditorMetadataFromHtml removes editor-only attributes but keeps page scoping", () => {
  const html = `<section data-celion-page="page-1" class="celion-page">
  <h1 data-celion-id="title" data-role="title" data-editable="true" data-selected="true">Title</h1>
  <div data-celion-editor-chrome="true" data-celion-hovered="layout"></div>
</section>`;

  const cleanHtml = stripEditorMetadataFromHtml(html);

  assert.match(cleanHtml, /data-celion-page="page-1"/);
  assert.doesNotMatch(cleanHtml, /data-celion-id|data-role|data-editable|data-selected|data-celion-hovered|data-celion-editor-chrome/);
});
