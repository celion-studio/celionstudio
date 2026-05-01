import assert from "node:assert/strict";
import test from "node:test";
import { clearEditorSelectionForExport } from "./export-cleanup";

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
