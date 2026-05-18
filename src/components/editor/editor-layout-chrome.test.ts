import assert from "node:assert/strict";
import test from "node:test";
import type { CelionEditableElement } from "@/lib/ebook-document";
import { getLayoutTargetElement } from "./editor-layout-chrome";

test("getLayoutTargetElement resolves duplicate editable ids inside the selected page", () => {
  const firstPageElement = { page: "page-1" };
  const secondPageElement = { page: "page-2" };
  const editable: CelionEditableElement = {
    id: "headline",
    role: "headline",
    type: "text",
    selector: `[data-celion-id="headline"]`,
    label: "Headline",
    editableProps: ["text"],
  };
  const pages = new Map([
    ["page-1", { querySelector: () => firstPageElement }],
    ["page-2", { querySelector: () => secondPageElement }],
  ]);
  const doc = {
    querySelector(selector: string) {
      const pageMatch = selector.match(/\[data-celion-slide="([^"]+)"\]/);
      if (pageMatch) return pages.get(pageMatch[1]!) ?? null;
      return firstPageElement;
    },
  } as unknown as Document;

  assert.equal(getLayoutTargetElement(doc, editable), firstPageElement);
  assert.equal(getLayoutTargetElement(doc, editable, "page-2"), secondPageElement);
});
