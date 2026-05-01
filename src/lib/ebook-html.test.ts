import assert from "node:assert/strict";
import test from "node:test";
import { countCelionSlides, normalizeEbookHtmlSlideContract, sanitizeEbookHtmlForCanvas, validateCelionSlideHtml } from "./ebook-html";
import { parseEbookGenerateRequest } from "../app/api/ebook/generate/route";
import { parseEbookSaveRequest, prepareEbookDocumentForSave, prepareEbookHtmlForSave } from "../app/api/ebook/save/route";

const validSlideHtml = `<!doctype html>
<html>
<head>
  <style>
    @page { size: 148mm 210mm; margin: 0; }
    .slide { width: 559px; height: 794px; overflow: hidden; page-break-after: always; }
  </style>
</head>
<body>
  <div class="slide" data-slide="1"><h1>Useful preview</h1><p>${"Readable content. ".repeat(40)}</p></div>
</body>
</html>`;

test("sanitizeEbookHtmlForCanvas removes modern color functions including nested values", () => {
  const html = `
    <style>
      .slide {
        color: oklch(0.2 0.03 240);
        background: color-mix(in srgb, var(--accent) 12%, #ffffff);
        border-color: lab(20% 10 5);
        box-shadow: 0 10px 30px color(display-p3 0 0 0 / .2);
      }
    </style>
  `;

  const sanitized = sanitizeEbookHtmlForCanvas(html);

  assert.doesNotMatch(sanitized, /color-mix|oklch|lab\(|lch\(|color\(/i);
  assert.match(sanitized, /color: #18181b/);
  assert.match(sanitized, /background: #f8fafc/);
  assert.match(sanitized, /border-color: #e4e4e7/);
  assert.match(sanitized, /box-shadow: 0 10px 30px rgba\(0,0,0,0\.14\)/);
});

test("sanitizeEbookHtmlForCanvas keeps ordinary color names and CSS variables", () => {
  const html = `<style>.slide{color:var(--ink);background:#fff;border:1px solid red;}</style>`;

  assert.equal(sanitizeEbookHtmlForCanvas(html), html);
});

test("normalizeEbookHtmlSlideContract converts page tokens without touching page-number", () => {
  const html = `<!doctype html><html><head><style>
    .page { width: 559px; height: 794px; overflow: hidden; page-break-after: always; }
    .page-number { color: red; }
  </style></head><body>
    <div class="page cover" data-page="1"><span class="page-number">1</span></div>
  </body></html>`;

  const normalized = normalizeEbookHtmlSlideContract(html);

  assert.match(normalized, /class="slide cover"/);
  assert.match(normalized, /data-slide="1"/);
  assert.match(normalized, /\.slide \{/);
  assert.match(normalized, /\.page-number/);
  assert.doesNotMatch(normalized, /data-page=/);
  assert.doesNotMatch(normalized, /class="page(?:\s|")/);
});

test("validateCelionSlideHtml accepts the Celion A5 slide format", () => {
  const result = validateCelionSlideHtml(validSlideHtml, {
    minSlides: 1,
    minVisibleTextLength: 100,
  });

  assert.equal(result.ok, true);
  assert.equal(result.slideCount, 1);
  assert.deepEqual(result.errors, []);
});

test("validateCelionSlideHtml rejects page-based or export-unsafe HTML", () => {
  const result = validateCelionSlideHtml(`
    <!doctype html>
    <html>
      <head>
        <style>
          @page { size: 148mm 210mm; margin: 0; }
          .page { width: 148mm; height: 210mm; overflow: hidden; background: color-mix(in srgb, red, white); }
        </style>
      </head>
      <body><div class="page" data-page="1">Bad format</div></body>
    </html>
  `);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(".slide/data-slide")));
  assert.ok(result.errors.some((error) => error.includes("unsupported by html2canvas")));
});

test("validateCelionSlideHtml rejects repeated generic slide headings", () => {
  const badGenericHtml = `<!doctype html>
    <html>
      <head>
        <style>
          @page { size: 148mm 210mm; margin: 0; }
          .slide { width: 559px; height: 794px; overflow: hidden; page-break-after: always; }
        </style>
      </head>
      <body>
        <div class="slide" data-slide="1">
          <div class="slide-header"><span>The core idea</span><span>Guidebook</span></div>
          <p class="eyebrow">The core idea</p>
          <h2>The core idea 2</h2>
          <p>${"Useful ebook content. ".repeat(20)}</p>
        </div>
      </body>
    </html>`;

  const result = validateCelionSlideHtml(badGenericHtml);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("generic outline headings")));

  const warningOnly = validateCelionSlideHtml(badGenericHtml, {
    allowGenericOutlineHeadings: true,
  });
  assert.equal(warningOnly.ok, true);
});

test("countCelionSlides only counts the exact slide class token", () => {
  const html = `
    <div class="slide" data-slide="1"></div>
    <div class="slide-header"></div>
    <div class="my-slide"></div>
    <div class="slide-footer"></div>
    <div class="cover slide style-bold" data-slide="2"></div>
  `;

  assert.equal(countCelionSlides(html), 2);
});

test("ebook routes report malformed JSON as invalid requests", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: "{not-json",
  });

  assert.deepEqual(await parseEbookGenerateRequest(request.clone()), {
    ok: false,
    message: "Invalid JSON",
  });
  assert.deepEqual(await parseEbookSaveRequest(request), {
    ok: false,
    message: "Invalid JSON",
  });
});

test("prepareEbookHtmlForSave sanitizes and validates Celion A5 slide HTML", () => {
  const html = validSlideHtml.replace(
    "overflow: hidden;",
    "overflow: hidden; color: oklch(0.2 0.03 240);",
  );
  const result = prepareEbookHtmlForSave(html);

  assert.equal(result.ok, true);
  assert.doesNotMatch(result.html, /oklch/i);

  const invalid = prepareEbookHtmlForSave("<html><body><div class=\"page\">Bad</div></body></html>");
  assert.equal(invalid.ok, false);
  assert.ok(invalid.message.includes("Output must"));
});

test("prepareEbookDocumentForSave validates and compiles a page-level document", () => {
  const result = prepareEbookDocumentForSave({
    version: 1,
    title: "Minimal ebook",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    pages: [
      {
        id: "page-1",
        index: 0,
        title: "Opening page",
        role: "cover",
        html: `
          <section data-celion-page="page-1">
            <h1>Opening page</h1>
            <p>A concise page-level ebook document can be compiled for the canvas.</p>
          </section>
        `,
        css: `[data-celion-page="page-1"] { color: oklch(0.2 0.03 240); }`,
        manifest: { editableElements: [] },
        version: 1,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.match(result.html, /class="slide celion-page-shell"/);
  assert.doesNotMatch(result.html, /oklch/i);
  if (result.ok) {
    assert.doesNotMatch(result.document.pages[0]?.css ?? "", /oklch/i);
  }
});

test("prepareEbookDocumentForSave rejects malformed document inputs", () => {
  const malformedInputs = [
    {},
    [],
    null,
    {
      version: 1,
      title: "Malformed manifest",
      size: { width: 559, height: 794, unit: "px" },
      themeCss: "",
      pages: [
        {
          id: "page-1",
          index: 0,
          title: "Opening page",
          role: "cover",
          html: `
            <section data-celion-page="page-1">
              <h1 data-celion-id="headline">Opening page</h1>
            </section>
          `,
          css: "",
          manifest: {
            editableElements: [
              {
                id: "headline",
                role: "headline",
                type: "unknown",
                selector: "",
                label: "Headline",
                editableProps: ["text"],
              },
            ],
          },
          version: 1,
        },
      ],
    },
  ];

  for (const input of malformedInputs) {
    assert.equal(prepareEbookDocumentForSave(input).ok, false);
  }
});
