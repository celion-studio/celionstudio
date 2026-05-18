import assert from "node:assert/strict";
import test from "node:test";
import { parseEbookSaveRequest } from "../app/api/ebook/save/route";
import { prepareEbookDocumentForSave, prepareEbookHtmlForSave } from "./ebook-save";

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

test("ebook save request reports malformed JSON as invalid requests", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: "{not-json",
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

test("prepareEbookHtmlForSave rejects active legacy HTML markup", () => {
  const scriptResult = prepareEbookHtmlForSave(
    validSlideHtml.replace("</body>", "<script>alert('x')</script></body>"),
  );
  assert.equal(scriptResult.ok, false);
  assert.match(scriptResult.message, /unsupported <script>/i);

  const eventHandlerResult = prepareEbookHtmlForSave(
    validSlideHtml.replace("</body>", "<img src=\"x\" onerror=\"alert(1)\" /></body>"),
  );
  assert.equal(eventHandlerResult.ok, false);
  assert.match(eventHandlerResult.message, /event handler/i);
});

test("prepareEbookDocumentForSave validates and compiles a page-level document", () => {
  const result = prepareEbookDocumentForSave({
    version: 1,
    title: "Minimal ebook",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    slides: [
      {
        id: "page-1",
        index: 0,
        title: "Opening page",
        role: "cover",
        html: `
          <section data-celion-slide="page-1">
            <h1>Opening page</h1>
            <p>A concise page-level ebook document can be compiled for the canvas.</p>
          </section>
        `,
        css: `[data-celion-slide="page-1"] { color: oklch(0.2 0.03 240); }`,
        manifest: { editableElements: [] },
        version: 1,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.match(result.html, /class="slide celion-page-shell"/);
  assert.doesNotMatch(result.html, /oklch/i);
  if (result.ok) {
    assert.doesNotMatch(result.document.slides[0]?.css ?? "", /oklch/i);
  }
});

test("prepareEbookDocumentForSave rejects oversized save payloads", () => {
  const result = prepareEbookDocumentForSave({
    version: 1,
    title: "Too many pages",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    slides: Array.from({ length: 31 }, (_, index) => ({
      id: `page-${index + 1}`,
      index,
      title: `Page ${index + 1}`,
      role: "page",
      html: `<section data-celion-slide="page-${index + 1}"><p>Readable page.</p></section>`,
      css: "",
      manifest: { editableElements: [] },
      version: 1,
    })),
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Too many ebook pages/);
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
      slides: [
        {
          id: "page-1",
          index: 0,
          title: "Opening page",
          role: "cover",
          html: `
            <section data-celion-slide="page-1">
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
