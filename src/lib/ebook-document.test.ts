import assert from "node:assert/strict";
import test from "node:test";
import { compileEbookDocumentToHtml, insertSlide, sanitizeEbookDocument, type CelionEbookDocument, validateEbookDocument } from "./ebook-document";
import { validateCelionSlideHtml } from "./ebook-html";

const validDocument: CelionEbookDocument = {
  version: 1,
  title: "TOEFL Reading Guide",
  size: { width: 559, height: 794, unit: "px" },
  themeCss: "",
  slides: [
    {
      id: "cover",
      index: 0,
      title: "Cover",
      role: "cover",
      version: 1,
      html: `<section data-celion-slide="cover" class="celion-slide">
  <h1 data-celion-id="cover-title" data-role="title" data-editable="true">TOEFL Reading Guide</h1>
  <p data-celion-id="cover-subtitle" data-role="subtitle" data-editable="true">A focused practice companion for building speed, accuracy, and confidence.</p>
</section>`,
      css: `[data-celion-slide="cover"] {
  width: 100%;
  height: 100%;
  padding: 64px;
  color: #18181b;
  background: #f8fafc;
}
[data-celion-slide="cover"] h1 {
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

test("validateEbookDocument accepts scoped slide HTML, CSS, and manifest", () => {
  const result = validateEbookDocument(validDocument);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("insertSlide reindexes slides and keeps slide ids unique", () => {
  const inserted = insertSlide({
    document: validDocument,
    insertIndex: 0,
    slide: {
      ...validDocument.slides[0],
      id: "cover",
      title: "Inserted slide",
    },
  });
  const validation = validateEbookDocument(inserted);

  assert.equal(inserted.slides.length, 2);
  assert.equal(inserted.slides[0].index, 0);
  assert.equal(inserted.slides[1].index, 1);
  assert.equal(inserted.slides[0].id, "cover-2");
  assert.equal(inserted.slides[0].html.includes('data-celion-slide="cover-2"'), true);
  assert.equal(inserted.slides[0].css.includes('[data-celion-slide="cover-2"]'), true);
  assert.equal(validation.ok, true, validation.errors.join("\n"));
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

test("sanitizeEbookDocument decorates clean HTML with stable editor ids and manifest entries", () => {
  const document = sanitizeEbookDocument({
    ...validDocument,
    slides: [
      {
        id: "clean",
        index: 0,
        title: "Clean slide",
        role: "insight",
        version: 1,
        html: `<section class="clean-slide">
  <h1>Clean heading</h1>
  <p>Clean body copy</p>
  <img src="/placeholder.png" alt="Placeholder" />
</section>`,
        css: `[data-celion-slide="clean"] {
  width: 559px;
  height: 794px;
  overflow: hidden;
}
[data-celion-slide="clean"] h1 {
  font-size: 40px;
}`,
        manifest: { editableElements: [] },
      },
    ],
  });
  const slide = document.slides[0]!;
  const validation = validateEbookDocument(document);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.match(slide.html, /data-celion-slide="clean"/);
  assert.match(slide.html, /data-celion-id="clean-text-001"/);
  assert.match(slide.html, /data-celion-id="clean-text-002"/);
  assert.match(slide.html, /data-celion-id="clean-image-001"/);
  assert.deepEqual(
    slide.manifest.editableElements.map((element) => [element.id, element.type]),
    [
      ["clean-text-001", "text"],
      ["clean-text-002", "text"],
      ["clean-image-001", "image"],
    ],
  );
});

test("sanitizeEbookDocument preserves existing editor ids and rewrites duplicate ids", () => {
  const document = sanitizeEbookDocument({
    ...validDocument,
    slides: [
      {
        id: "dupe",
        index: 0,
        title: "Duplicate ids",
        role: "insight",
        version: 1,
        html: `<section data-celion-slide="dupe" class="celion-slide">
  <h1 data-celion-id="hero-title">Existing title</h1>
  <p data-celion-id="hero-title">Duplicate body</p>
</section>`,
        css: `[data-celion-slide="dupe"] {
  width: 559px;
  height: 794px;
  overflow: hidden;
}`,
        manifest: { editableElements: [] },
      },
    ],
  });
  const slide = document.slides[0]!;
  const ids = slide.manifest.editableElements.map((element) => element.id);
  const validation = validateEbookDocument(document);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.ok(ids.includes("hero-title"));
  assert.ok(ids.includes("dupe-text-001"));
  assert.equal(new Set(ids).size, ids.length);
});

test("validateEbookDocument rejects unscoped CSS selectors", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        css: `.cover-title { color: #18181b; }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("must start with [data-celion-slide=\"cover\"]")));
});

test("validateEbookDocument rejects unscoped CSS selectors inside at-rules", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        css: `@media print {
  [data-celion-slide="cover"] { color: #18181b; }
  .bad { color: red; }
}`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('CSS selector ".bad" must start with [data-celion-slide="cover"]')));
});

test("validateEbookDocument rejects unscoped pseudo selectors", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        css: `.bad:hover { color: red; }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('CSS selector ".bad:hover" must start with [data-celion-slide="cover"]')));
});

test("validateEbookDocument rejects non-block CSS at-rules", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
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
    slides: [
      {
        ...validDocument.slides[0],
        css: `[data-celion-slide="cover"] { background-image: url("https://example.com/x.png"); }`,
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("unsafe markup or url() tokens")));
});

test("validateEbookDocument rejects style-bearing slide HTML", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace("</section>", `<style>@import url("https://example.com/x.css");</style></section>`),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("forbidden <style> tag")));
});

test("validateEbookDocument rejects inline style attributes", () => {
  const result = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace("data-role=\"title\"", `data-role="title" style="background-image:url('https://example.com/x.png')"`)
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
    slides: [
      {
        ...validDocument.slides[0],
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
    slides: [
      {
        ...validDocument.slides[0],
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
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace("</section>", `<span data-celion-id="orphan" data-role="note" data-editable="true">Orphan</span></section>`),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('HTML editable id "orphan" is missing from manifest')));
});

test("validateEbookDocument rejects duplicate editable ids", () => {
  const duplicateHtml = validateEbookDocument({
    ...validDocument,
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace(
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
    slides: [
      {
        ...validDocument.slides[0],
        manifest: {
          editableElements: [
            ...validDocument.slides[0].manifest.editableElements,
            {
              ...validDocument.slides[0].manifest.editableElements[0],
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
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace(
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
    slides: [
      {
        ...validDocument.slides[0],
        html: validDocument.slides[0].html.replace(
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
    slides: [
      {
        ...validDocument.slides[0],
        manifest: {
          editableElements: [
            {
              ...validDocument.slides[0].manifest.editableElements[0],
              selector: '[data-celion-id="cover-title"] + [data-celion-id="cover-subtitle"]',
            },
            validDocument.slides[0].manifest.editableElements[1],
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
    slides: [
      {
        ...validDocument.slides[0],
        manifest: {
          editableElements: [
            ...validDocument.slides[0].manifest.editableElements,
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
