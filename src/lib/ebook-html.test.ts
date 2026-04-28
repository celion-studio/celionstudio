import assert from "node:assert/strict";
import test from "node:test";
import { countCelionSlides, sanitizeEbookHtmlForCanvas, validateCelionSlideHtml } from "./ebook-html";

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
