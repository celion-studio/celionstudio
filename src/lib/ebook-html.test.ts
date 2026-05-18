import assert from "node:assert/strict";
import test from "node:test";
import { countCelionSlides, normalizeEbookHtmlSlideContract, sanitizeEbookHtmlForCanvas, validateCelionSlideHtml } from "./ebook-html";
import { ebookGenerationFailureStatus, parseSlideGenerateRequest } from "../app/api/ebook/generate/route";
import { SlideGenerationError } from "./ebook-generation";
import { MAX_EBOOK_PLAN_SLIDES } from "./request-limits";

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

function validRequestPlan(slideCount = 10) {
  return {
    title: "Launch guide",
    subtitle: "A practical source-led guide",
    author: "Celion",
    targetAudience: "founders",
    readerPromise: "Make the source useful.",
    language: "English",
    sourceAssessment: {
      sourceScale: "medium",
      detectedSections: ["Offer", "Audience"],
      essentialSections: ["Offer", "Audience"],
      compressionRisk: "low",
      recommendedSlideCount: slideCount,
      coveragePlan: ["Cover the main source argument"],
      rationale: "The source fits the selected slide count.",
    },
    cover: {
      eyebrow: "Guide",
      title: "Launch guide",
      subtitle: "A practical source-led guide",
      promise: "Make the source useful.",
      visualDirection: "Clean typographic cover.",
    },
    editorialStrategy: {
      angle: "Turn notes into a useful guide.",
      readerProblem: "The source is hard to scan.",
      promisedOutcome: "A clearer reading path.",
      narrativeArc: "Problem, method, example, checklist.",
    },
    designBrief: {
      mood: "focused",
      visualSystem: "clean typography and restrained accent",
      coverConcept: "source-first title treatment",
      layoutRhythm: "alternate text-led and checklist pages",
      avoid: ["generic section labels"],
    },
    slides: Array.from({ length: slideCount }, (_, index) => ({
      role: index === 0 ? "cover" : "insight",
      eyebrow: "Section",
      headline: `Source-led slide ${index + 1}`,
      body: "A concise source-backed body that is long enough to render as a useful page.",
      evidence: "Source-backed detail.",
      sourceAnchors: ["source-backed detail"],
      visualDirection: "Use a distinct editorial layout.",
    })),
  };
}

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

test("ebook generate request reports malformed JSON as invalid requests", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: "{not-json",
  });

  assert.deepEqual(await parseSlideGenerateRequest(request.clone()), {
    ok: false,
    message: "Invalid JSON",
  });
});

test("ebook generate request rejects excessive source volume before generation", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: Array.from({ length: 9 }, (_, index) => ({
        id: `source-${index}`,
        kind: "pasted_text",
        name: `Source ${index}`,
        content: "Useful source content",
        excerpt: "",
      })),
      ebookStyle: "minimal",
    }),
  });

  assert.deepEqual(await parseSlideGenerateRequest(request), {
    ok: false,
    message: "Too many sources. Maximum is 8.",
  });
});

test("ebook generate request rejects oversized fields before generation", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "T".repeat(201),
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
    }),
  });

  assert.deepEqual(await parseSlideGenerateRequest(request), {
    ok: false,
    message: "Title is too long. Maximum is 200 characters.",
  });
});

test("ebook generate request rejects oversized source content before generation", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "",
      sources: [
        {
          id: "source-1",
          kind: "pasted_text",
          name: "Large source",
          content: "S".repeat(50001),
          excerpt: "",
        },
      ],
      ebookStyle: "minimal",
    }),
  });

  assert.deepEqual(await parseSlideGenerateRequest(request), {
    ok: false,
    message: "Source content is too long. Maximum is 50000 characters per source.",
  });
});

test("ebook generate request ignores fallback sourceText limit when structured sources are present", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "S".repeat(100001),
      sources: [
        {
          id: "source-1",
          kind: "pasted_text",
          name: "Structured source",
          content: "Useful source content",
          excerpt: "",
        },
      ],
      ebookStyle: "minimal",
    }),
  });

  const result = await parseSlideGenerateRequest(request);

  assert.equal(result.ok, true);
});

test("ebook generate request accepts a bounded approved plan", async () => {
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
      plan: validRequestPlan(),
    }),
  });

  const result = await parseSlideGenerateRequest(request);

  assert.equal(result.ok, true);
});

test("ebook generate request normalizes oversized approved plans before generation", async () => {
  const tooManySlides = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
      plan: validRequestPlan(31),
    }),
  });

  const tooManySlidesResult = await parseSlideGenerateRequest(tooManySlides);
  assert.equal(tooManySlidesResult.ok, true);
  if (tooManySlidesResult.ok) {
    assert.equal(tooManySlidesResult.data.plan?.slides.length, MAX_EBOOK_PLAN_SLIDES);
    assert.equal(tooManySlidesResult.data.plan?.sourceAssessment.recommendedSlideCount, MAX_EBOOK_PLAN_SLIDES);
  }

  const longBodyPlan = validRequestPlan();
  longBodyPlan.slides[0]!.body = "B".repeat(4001);
  const overlongSlideBody = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
      plan: longBodyPlan,
    }),
  });

  const overlongSlideBodyResult = await parseSlideGenerateRequest(overlongSlideBody);
  assert.equal(overlongSlideBodyResult.ok, true);
  if (overlongSlideBodyResult.ok) {
    assert.equal(overlongSlideBodyResult.data.plan?.slides[0]?.body.length, 4000);
  }
});

test("ebook generation route preserves provider timeout status", () => {
  assert.equal(
    ebookGenerationFailureStatus(false, new SlideGenerationError(
      "gemini_call_failed",
      "Vertex AI timed out while designing the ebook.",
      { status: 504, stage: "html" },
    )),
    504,
  );
  assert.equal(
    ebookGenerationFailureStatus(true, new SlideGenerationError(
      "plan_invalid",
      "Plan is too large or invalid.",
      { status: 504, stage: "plan" },
    )),
    400,
  );
});

test("ebook generate request caps approved plan recommendation to actual slide count", async () => {
  const plan = validRequestPlan(21);
  plan.sourceAssessment.recommendedSlideCount = 24;
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
      plan,
    }),
  });

  const result = await parseSlideGenerateRequest(request);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.plan?.slides.length, MAX_EBOOK_PLAN_SLIDES);
    assert.equal(result.data.plan?.sourceAssessment.recommendedSlideCount, MAX_EBOOK_PLAN_SLIDES);
  }
});

test("ebook generate request accepts approved plans with nullable optional fields", async () => {
  const plan = validRequestPlan(21) as unknown as {
    sourceAssessment: Record<string, unknown>;
    cover: Record<string, unknown>;
    slides: Array<Record<string, unknown>>;
  };
  plan.sourceAssessment.recommendedSlideCount = "24";
  plan.sourceAssessment.detectedSections = ["Intro", null, "Offer"];
  plan.cover.eyebrow = null;
  plan.slides[0]!.eyebrow = null;
  plan.slides[0]!.sourceAnchors = ["source-backed detail", null, "another detail"];
  const request = new Request("http://example.test", {
    method: "POST",
    body: JSON.stringify({
      title: "Launch brief",
      sourceText: "Short pasted source",
      sources: [],
      ebookStyle: "minimal",
      plan,
    }),
  });

  const result = await parseSlideGenerateRequest(request);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.plan?.slides.length, MAX_EBOOK_PLAN_SLIDES);
    assert.equal(result.data.plan?.sourceAssessment.recommendedSlideCount, MAX_EBOOK_PLAN_SLIDES);
    assert.equal(result.data.plan?.sourceAssessment.detectedSections.length, 2);
    assert.equal(result.data.plan?.cover.eyebrow, "");
    assert.equal(result.data.plan?.slides[0]?.eyebrow, "");
    assert.deepEqual(result.data.plan?.slides[0]?.sourceAnchors, ["source-backed detail", "another detail"]);
  }
});
