import assert from "node:assert/strict";
import test from "node:test";
import { compileEbookDocumentToHtml, type CelionEbookDocument, validateEbookDocument } from "./ebook-document";
import { validateCelionSlideHtml } from "./ebook-html";

const validDocument: CelionEbookDocument = {
  version: 1,
  title: "TOEFL Reading Guide",
  size: { width: 559, height: 794, unit: "px" },
  themeCss: "",
  pages: [
    {
      id: "cover",
      index: 0,
      title: "Cover",
      role: "cover",
      version: 1,
      html: `<section data-celion-page="cover" class="celion-page">
  <h1 data-celion-id="cover-title" data-role="title" data-editable="true">TOEFL Reading Guide</h1>
  <p data-celion-id="cover-subtitle" data-role="subtitle" data-editable="true">A focused practice companion for building speed, accuracy, and confidence.</p>
</section>`,
      css: `[data-celion-page="cover"] {
  width: 100%;
  height: 100%;
  padding: 64px;
  color: #18181b;
  background: #f8fafc;
}
[data-celion-page="cover"] h1 {
  margin: 0 0 24px;
  font-size: 48px;
}`,
      manifest: {
        editableElements: [
          {
            id: "cover-title",
            role: "title",
            type: "text",
            selector: '[data-celion-id="cover-title"]',
            label: "Cover title",
            editableProps: ["text", "fontSize", "color"],
            maxLength: 80,
          },
          {
            id: "cover-subtitle",
            role: "subtitle",
            type: "text",
            selector: '[data-celion-id="cover-subtitle"]',
            label: "Cover subtitle",
            editableProps: ["text", "fontSize", "color"],
            maxLength: 180,
          },
        ],
      },
    },
  ],
};

test("validateEbookDocument accepts scoped page HTML, CSS, and manifest", () => {
  const result = validateEbookDocument(validDocument);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("compileEbookDocumentToHtml produces valid Celion slide HTML", () => {
  const html = compileEbookDocumentToHtml(validDocument);
  const result = validateCelionSlideHtml(html, {
    minSlides: 1,
    minVisibleTextLength: 40,
    allowGenericOutlineHeadings: true,
  });

  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("validateEbookDocument rejects unscoped CSS selectors", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `.cover-title { color: #18181b; }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("must start with [data-celion-page=\"cover\"]")));
});

test("validateEbookDocument rejects unscoped CSS selectors inside at-rules", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `@media print {
  [data-celion-page="cover"] { color: #18181b; }
  .bad { color: red; }
}`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('CSS selector ".bad" must start with [data-celion-page="cover"]')));
});

test("validateEbookDocument rejects unscoped pseudo selectors", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `.bad:hover { color: red; }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('CSS selector ".bad:hover" must start with [data-celion-page="cover"]')));
});

test("validateEbookDocument rejects non-block CSS at-rules", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `@import url("https://example.com/x.css");`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Unsupported CSS at-rule @import")));
});

test("validateEbookDocument rejects unsafe CSS tokens", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `[data-celion-page="cover"] { background-image: url("https://example.com/x.png"); }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("unsafe markup or url() tokens")));
});

test("validateEbookDocument rejects style-bearing page HTML", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace("</section>", `<style>@import url("https://example.com/x.css");</style></section>`),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("forbidden <style> tag")));
});

test("validateEbookDocument rejects inline style attributes", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace("data-role=\"title\"", `data-role="title" style="background-image:url('https://example.com/x.png')"`)
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("forbidden inline style attributes")));
});

test("validateEbookDocument restricts theme CSS to root custom properties", () => {
  const unsafeTheme = validateEbookDocument({
    ...validDocument,
    themeCss: `.global { color: red; }`,
  });
  assert.equal(unsafeTheme.ok, false);
  assert.ok(unsafeTheme.errors.some((error) => error.includes("Theme CSS only supports :root custom property blocks")));

  const safeTheme = validateEbookDocument({
    ...validDocument,
    themeCss: `:root { --accent: #111111; --muted: rgba(0,0,0,0.5); }`,
  });
  assert.equal(safeTheme.ok, true, safeTheme.errors.join("\n"));
});

test("validateEbookDocument rejects unsupported block CSS at-rules", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        css: `@keyframes fade { from { opacity: 0; } to { opacity: 1; } }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("Unsupported CSS at-rule @keyframes")));
});

test("validateEbookDocument rejects malformed manifest entries", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        manifest: {
          editableElements: [
            {
              id: "bad-entry",
              role: "title",
              type: "banner",
              selector: "",
              label: "Bad entry",
              editableProps: ["text", "spin"],
            },
          ],
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("manifest editable entry 1 has invalid type")));
  assert.ok(result.errors.some((error) => error.includes("manifest editable entry 1 is missing selector")));
  assert.ok(result.errors.some((error) => error.includes("manifest editable entry 1 has invalid editableProps")));
});

test("validateEbookDocument rejects editable HTML missing from manifest", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace("</section>", `<span data-celion-id="orphan" data-role="note" data-editable="true">Orphan</span></section>`),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('HTML editable id "orphan" is missing from manifest')));
});

test("validateEbookDocument rejects duplicate editable ids", () => {
  const duplicateHtml = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace(
          "</section>",
          `<span data-celion-id="cover-title" data-role="note" data-editable="true">Duplicate</span></section>`,
        ),
      },
    ],
  });

  assert.equal(duplicateHtml.ok, false);
  assert.ok(duplicateHtml.errors.some((error) => error.includes('HTML editable id "cover-title" must be unique')));

  const duplicateManifest = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        manifest: {
          editableElements: [
            ...validDocument.pages[0].manifest.editableElements,
            {
              ...validDocument.pages[0].manifest.editableElements[0],
              label: "Duplicate manifest entry",
            },
          ],
        },
      },
    ],
  });

  assert.equal(duplicateManifest.ok, false);
  assert.ok(duplicateManifest.errors.some((error) => error.includes('manifest editable id "cover-title" must be unique')));
});

test("validateEbookDocument detects spaced and unquoted editable ids", () => {
  const spacedDuplicate = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace(
          "</section>",
          `<span data-celion-id = "cover-title" data-role="note" data-editable="true">Duplicate</span></section>`,
        ),
      },
    ],
  });

  assert.equal(spacedDuplicate.ok, false);
  assert.ok(spacedDuplicate.errors.some((error) => error.includes('HTML editable id "cover-title" must be unique')));

  const unquotedOrphan = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        html: validDocument.pages[0].html.replace(
          "</section>",
          `<span data-celion-id=orphan data-role="note" data-editable="true">Orphan</span></section>`,
        ),
      },
    ],
  });

  assert.equal(unquotedOrphan.ok, false);
  assert.ok(unquotedOrphan.errors.some((error) => error.includes('HTML editable id "orphan" is missing from manifest')));
});

test("validateEbookDocument rejects manifest selectors that do not target their id", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        manifest: {
          editableElements: [
            {
              ...validDocument.pages[0].manifest.editableElements[0],
              selector: '[data-celion-id="cover-title"] + [data-celion-id="cover-subtitle"]',
            },
            validDocument.pages[0].manifest.editableElements[1],
          ],
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("selector must be an exact data-celion-id selector")));
});

test("validateEbookDocument rejects manifest entries missing from HTML", () => {
  const result = validateEbookDocument({
    ...validDocument,
    pages: [
      {
        ...validDocument.pages[0],
        manifest: {
          editableElements: [
            ...validDocument.pages[0].manifest.editableElements,
            {
              id: "missing-editable",
              role: "note",
              type: "text",
              selector: '[data-celion-id="missing-editable"]',
              label: "Missing editable",
              editableProps: ["text"],
            },
          ],
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('manifest editable id "missing-editable"')));
});
