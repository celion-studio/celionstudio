import assert from "node:assert/strict";
import test from "node:test";
import {
  EbookGenerationError,
  generateEbookHtml,
  generateEbookHtmlFromPlan,
  generateEbookHtmlWithDiagnostics,
} from "./ebook-generation";
import type { CelionEbookDocument } from "./ebook-document";
import { setGeminiClientFactoryForTests } from "./ai/gemini";

const originalGoogleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
process.env.GOOGLE_CLOUD_PROJECT = "celion-test";
process.on("exit", () => {
  if (originalGoogleCloudProject === undefined) delete process.env.GOOGLE_CLOUD_PROJECT;
  else process.env.GOOGLE_CLOUD_PROJECT = originalGoogleCloudProject;
});
function muteConsoleWarn() {
  const originalWarn = console.warn;
  console.warn = () => {};
  return () => {
    console.warn = originalWarn;
  };
}

function validPlan(slideCount = 10, recommendedSlideCount = slideCount) {
  return {
    title: "Source-led guide",
    subtitle: "A practical guide from the source",
    author: "Celion",
    targetAudience: "founders",
    readerPromise: "Make the source useful.",
    language: "English",
    sourceAssessment: {
      sourceScale: slideCount >= 18 ? "long" : "medium",
      detectedSections: ["Market", "Method", "Checklist"],
      essentialSections: ["Problem", "Method", "Example", "Checklist"],
      compressionRisk: slideCount >= 18 ? "high" : "low",
      recommendedSlideCount,
      coveragePlan: ["Cover source argument", "Preserve examples", "Close with checklist"],
      rationale: "Use enough slides to preserve source-backed substance.",
    },
    cover: {
      eyebrow: "Guide",
      title: "Source-led guide",
      subtitle: "A practical guide from the source",
      promise: "Turn source material into decisions.",
      visualDirection: "Confident cover with source-derived typography.",
    },
    editorialStrategy: {
      angle: "Turn source material into usable decisions.",
      readerProblem: "Readers have notes but no clear path.",
      promisedOutcome: "A clear sequence of useful decisions.",
      narrativeArc: "Problem, insight, method, example, checklist, next step.",
    },
    designBrief: {
      mood: "editorial and focused",
      visualSystem: "clean typography, varied layouts, restrained accent",
      coverConcept: "source-first title treatment",
      layoutRhythm: "alternate text-led pages with frameworks and lists",
      avoid: ["generic section labels", "repeated cover slots"],
    },
    slides: Array.from({ length: slideCount }, (_, index) => ({
      role: index === 0 ? "cover" : index === slideCount - 1 ? "cta" : "insight",
      eyebrow: index === 0 ? "Guide" : `Move ${index}`,
      headline: `Source-led decision ${index + 1}`,
      body: "This slide turns one source-backed idea into a concrete reader-facing move with enough useful copy to render well.",
      evidence: "Source-backed detail.",
      sourceAnchors: ["source-backed detail"],
      visualDirection: "Use a distinct editorial layout for this slide.",
    })),
  };
}

function geminiJsonResponse(value: unknown, init: ResponseInit = {}) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" }, ...init },
  );
}

function validEbookDocument(titlePrefix = "Founder decision", pageCount = 10): CelionEbookDocument {
  return {
    version: 1,
    title: "Source-led guide",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    pages: Array.from({ length: pageCount }, (_, index) => {
      const pageId = `page-${index + 1}`;
      const titleId = `${pageId}-title`;
      const bodyId = `${pageId}-body`;
      return {
        id: pageId,
        index,
        title: `${titlePrefix} ${index + 1}`,
        role: index === 0 ? "cover" : index === pageCount - 1 ? "cta" : "insight",
        version: 1,
        html: `<section data-celion-page="${pageId}" class="celion-page">
  <h1 data-celion-id="${titleId}" data-role="title" data-editable="true">${titlePrefix} ${index + 1}</h1>
  <p data-celion-id="${bodyId}" data-role="body" data-editable="true">${"Useful ebook content ".repeat(14)}</p>
</section>`,
        css: `[data-celion-page="${pageId}"] {
  width: 559px;
  height: 794px;
  overflow: hidden;
  padding: 56px;
  color: #111111;
  background: #ffffff;
}
[data-celion-page="${pageId}"] h1 {
  margin: 0 0 28px;
  font-size: 42px;
  line-height: 1.08;
}
[data-celion-page="${pageId}"] p {
  margin: 0;
  font-size: 18px;
  line-height: 1.62;
}`,
        manifest: {
          editableElements: [
            {
              id: titleId,
              role: "title",
              type: "text",
              selector: `[data-celion-id="${titleId}"]`,
              label: `Page ${index + 1} title`,
              editableProps: ["text", "fontSize", "color"],
              maxLength: 90,
            },
            {
              id: bodyId,
              role: "body",
              type: "text",
              selector: `[data-celion-id="${bodyId}"]`,
              label: `Page ${index + 1} body`,
              editableProps: ["text", "fontSize", "color"],
              maxLength: 600,
            },
          ],
        },
      };
    }),
  };
}

function setQueuedGemini(responses: Response[], calls: string[] = [], requestBodies: unknown[] = []) {
  setGeminiClientFactoryForTests(() => ({
    models: {
      async generateContent(params) {
        calls.push(`/models/${params.model}:generateContent`);
        requestBodies.push({
          generationConfig: {
            temperature: params.config.temperature,
            httpOptions: params.config.httpOptions,
          },
          systemInstruction: { parts: [{ text: params.config.systemInstruction }] },
          contents: [{ parts: [{ text: params.contents }] }],
        });

        const response = responses.shift();
        if (!response) throw new Error("No mocked response queued.");
        const body = await response.json() as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          error?: { message?: string; status?: string };
        };
        if (!response.ok) {
          const error = new Error(body.error?.message ?? response.statusText) as Error & {
            status: number;
          };
          error.status = response.status;
          throw error;
        }

        return {
          text: body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n"),
        };
      },
    },
  }));
}

const baseArgs = {
  title: "Model check",
  author: "Celion",
  purpose: "Organize the source into a useful slide guide.",
  targetAudience: "founders",
  sourceText: "# Market\n\nNotes",
  ebookStyle: "minimal" as const,
  accentColor: "#111111",
};

test("generateEbookHtml throws instead of saving fallback when plan Gemini is unavailable", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    new Response(
      JSON.stringify({ error: { status: "UNAVAILABLE", message: "This model is currently experiencing high demand." } }),
      { status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "application/json" } },
    ),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      /AI ebook planning failed/,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
test("generateEbookHtml logs failure reasons without source text", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  const sensitiveSource = "SECRET_SOURCE_TEXT_SHOULD_NOT_APPEAR_IN_WARNINGS";
  process.env.GEMINI_API_KEY = "test-key";
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  const args = { ...baseArgs, sourceText: `# Market\n\n${sensitiveSource} with enough length to become a paragraph.` };

  try {
    setGeminiClientFactoryForTests(() => ({
      models: {
        async generateContent() {
          throw new Error(sensitiveSource);
        },
      },
    }));
    await assert.rejects(() => generateEbookHtml(args), /AI ebook planning failed/);

    setQueuedGemini([
      geminiJsonResponse(validPlan()),
      geminiJsonResponse({}),
    ]);
    await assert.rejects(() => generateEbookHtml(args), /Gemini did not return an ebook document/);

    setQueuedGemini([
      geminiJsonResponse(validPlan()),
      geminiJsonResponse({ document: { ...validEbookDocument(), pages: [] } }),
    ]);
    await assert.rejects(() => generateEbookHtml(args), /did not pass Celion document validation/);

    const warningText = JSON.stringify(warnings);
    assert.match(warningText, /gemini_call_failed/);
    assert.match(warningText, /missing_html/);
    assert.match(warningText, /invalid_html/);
    assert.doesNotMatch(warningText, new RegExp(sensitiveSource));
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml surfaces plan Gemini rate limits as retryable generation errors", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for this model." } }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    }),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      (error) =>
        error instanceof Error &&
        error.message.includes("Gemini rate limit") &&
        "status" in error &&
        error.status === 429,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml surfaces document Gemini rate limits as retryable generation errors", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for this model." } }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    }),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      (error) =>
        error instanceof Error &&
        error.message.includes("Gemini rate limit") &&
        "status" in error &&
        error.status === 429,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml rejects invalid plans before HTML generation", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  const calls: string[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([geminiJsonResponse({ slides: [] })], calls);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      /plan with only 0 usable slides/,
    );
    assert.equal(calls.length, 1);
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml rejects structurally unusable Gemini document with validation details", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({
      document: {
        ...validEbookDocument(),
        pages: [
          {
            ...validEbookDocument().pages[0],
            css: `.bad { color: red; }`,
          },
        ],
      },
    }),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      (error) =>
        error instanceof EbookGenerationError &&
        error.stage === "html" &&
        error.reason === "invalid_html" &&
        typeof error.validation === "object" &&
        error.validation !== null &&
        "errors" in error.validation &&
        Array.isArray(error.validation.errors) &&
        error.validation.errors.some((message: unknown) =>
          typeof message === "string" && message.includes('must start with [data-celion-page="page-1"]'),
        ),
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml compiles structurally valid Gemini documents into HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document: validEbookDocument("The core idea") }),
  ]);

  try {
    const html = await generateEbookHtml(baseArgs);

    assert.match(html, /The core idea/i);
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml repairs missing manifest entries from Gemini page HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  const document = validEbookDocument("Recovered manifest");
  const firstPage = document.pages[0]!;
  document.pages[0] = {
    ...firstPage,
    html: firstPage.html.replace(
      "<h1",
      `<div data-celion-id="cov-eyebrow" data-role="eyebrow" data-editable="true">TOEFL GUIDE</div>\n  <h1`,
    ),
    manifest: {
      editableElements: firstPage.manifest.editableElements.filter((element) => element.id !== "cov-eyebrow"),
    },
  };

  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);

    assert.ok(result.diagnostics.ebookDocument);
    assert.match(result.html, /cov-eyebrow/);
    assert.ok(result.diagnostics.ebookDocument.pages[0]?.manifest.editableElements.some((element) => element.id === "cov-eyebrow"));
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml removes inline style attributes from Gemini page HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  const document = validEbookDocument("Inline style repair");
  const fourthPage = document.pages[3]!;
  const sixthPage = document.pages[5]!;
  document.pages[3] = {
    ...fourthPage,
    id: "p4",
    html: fourthPage.html
      .replace(/data-celion-page="page-4"/g, `data-celion-page="p4"`)
      .replace("<h1", `<h1 style="font-size: 999px; color: red;"`),
    css: fourthPage.css.replaceAll(`[data-celion-page="page-4"]`, `[data-celion-page="p4"]`),
  };
  document.pages[5] = {
    ...sixthPage,
    id: "p6",
    html: sixthPage.html
      .replace(/data-celion-page="page-6"/g, `data-celion-page="p6"`)
      .replace("<p", `<p style='margin-top:0'`),
    css: sixthPage.css.replaceAll(`[data-celion-page="page-6"]`, `[data-celion-page="p6"]`),
  };

  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);
    assert.ok(result.diagnostics.ebookDocument);
    const storedDocumentJson = JSON.stringify(result.diagnostics.ebookDocument);

    assert.doesNotMatch(storedDocumentJson, /\sstyle\s*=/i);
    assert.doesNotMatch(result.html, /\sstyle\s*=/i);
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtmlWithDiagnostics includes the normalized ebook document", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document: validEbookDocument("Source-led insight") }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);

    assert.match(result.html, /class="slide celion-page-shell"/);
    assert.match(result.html, /data-slide="1"/);
    assert.ok(result.diagnostics.ebookDocument);
    assert.equal(result.diagnostics.ebookDocument.version, 1);
    assert.equal(result.diagnostics.ebookDocument.pages.length, 10);
    assert.equal(result.diagnostics.ebookDocument.pages[0]?.id, "page-1");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtmlWithDiagnostics caps extra document pages to the MVP count", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document: validEbookDocument("Extra page", 12) }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);

    assert.ok(result.diagnostics.ebookDocument);
    assert.equal(result.diagnostics.ebookDocument.pages.length, 10);
    assert.match(result.html, /Extra page 10/i);
    assert.doesNotMatch(result.html, /Extra page 11/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtmlWithDiagnostics rejects documents with fewer pages than the approved plan", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan(10, 10)),
    geminiJsonResponse({ document: validEbookDocument("Missing page", 8) }),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtmlWithDiagnostics(baseArgs),
      /Gemini returned 8 pages for a 10-slide plan/,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtmlWithDiagnostics sanitizes unsupported color functions in diagnostics document", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  const document = validEbookDocument("Color-safe insight");
  document.themeCss = `:root { --shadow-color: color-mix(in srgb, #111 30%, white); }`;
  const firstPage = document.pages[0]!;
  document.pages[0] = {
    ...firstPage,
    css: `${firstPage.css}
[data-celion-page="page-1"] .accent {
  background: oklch(0.72 0.12 240);
}`,
  };
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);
    assert.ok(result.diagnostics.ebookDocument);
    const storedDocumentJson = JSON.stringify(result.diagnostics.ebookDocument);

    assert.doesNotMatch(storedDocumentJson, /color-mix|oklch/);
    assert.doesNotMatch(result.html, /color-mix|oklch/);
    assert.match(result.html, /Color-safe insight/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("ebook generation uses Flash-Lite for plan and Pro for document design", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  setQueuedGemini([
    geminiJsonResponse(validPlan()),
    geminiJsonResponse({ document: validEbookDocument() }),
  ], calls, requestBodies);

  try {
    await generateEbookHtml({ ...baseArgs, tone: "practical" });

    assert.ok(calls[0]?.includes("/models/gemini-2.5-flash-lite:generateContent"));
    assert.ok(calls[1]?.includes("/models/gemini-3.1-pro-preview:generateContent"));
    const planRequest = requestBodies[0] as {
      generationConfig?: { temperature?: number };
      systemInstruction?: { parts?: { text?: string }[] };
      contents?: { parts?: { text?: string }[] }[];
    };
    const htmlRequest = requestBodies[1] as typeof planRequest;
    const planSystem = planRequest.systemInstruction?.parts?.[0]?.text ?? "";
    const planPrompt = planRequest.contents?.[0]?.parts?.[0]?.text ?? "";
    const htmlSystem = htmlRequest.systemInstruction?.parts?.[0]?.text ?? "";
    const htmlPrompt = htmlRequest.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.equal(planRequest.generationConfig?.temperature, 0.75);
    assert.equal(htmlRequest.generationConfig?.temperature, 1);
    assert.match(planSystem, /senior editorial strategist/);
    assert.match(planPrompt, /Create a source-led A5 slide publication plan/);
    assert.match(planPrompt, /Purpose \/ use case/);
    assert.match(planPrompt, /Source material/);
    assert.match(planPrompt, /sourceAnchors/);
    assert.match(planPrompt, /Each slide visualDirection must name a concrete visual device/);
    assert.match(planPrompt, /evidence box, three-column framework grid, split comparison, timeline bar/);
    assert.match(planPrompt, /do not allow more than two text-led pages in a row/);
    assert.doesNotMatch(planPrompt, /Reader and product brief|sellable publication/);
    assert.match(htmlSystem, /approved editorial plan/);
    assert.match(htmlPrompt, /Approved plan/);
    assert.match(htmlPrompt, /Source-led decision 1/);
    assert.match(htmlPrompt, /Technical contract/);
    assert.match(htmlPrompt, /24px vertical space between major content groups/);
    assert.match(htmlPrompt, /line-height 1\.55-1\.75/);
    assert.match(htmlPrompt, /If content feels crowded, trim non-essential copy or simplify the device/);
    assert.match(htmlPrompt, /polished editorial card/);
    assert.match(htmlPrompt, /Honor each slide visualDirection with actual CSS-drawn structure/);
    assert.match(htmlPrompt, /Every non-cover page must express one primary structural device in CSS/);
    assert.match(htmlPrompt, /one memorable visual idea/);
    assert.match(htmlPrompt, /concrete visual structures/);
    assert.match(htmlPrompt, /at least five distinct layout families/);
    assert.match(htmlPrompt, /Do not reuse the same "headline \+ paragraph \+ one box" skeleton on consecutive pages/);
    assert.match(htmlPrompt, /Output only JSON with one "document" field/);
    assert.match(htmlPrompt, /Generate all pages in one response/);
    assert.match(htmlPrompt, /Generate exactly 10 pages/);
    assert.match(htmlPrompt, /data-celion-page="\{pageId\}"/);
    assert.match(htmlPrompt, /Never put style="" attributes in HTML/);
    assert.match(htmlPrompt, /Every page CSS selector starts with \[data-celion-page="\{pageId\}"\]/);
    assert.match(htmlPrompt, /Manifest includes every editable element/);
    assert.doesNotMatch(htmlPrompt, /# Market/);
    assert.doesNotMatch(planPrompt, /Core message:/);
    assert.doesNotMatch(htmlPrompt, /Why this matters now|The core idea|How to apply it/);
    assert.match(htmlPrompt, /Do not use color\(\), color-mix\(\), oklch\(\), lab\(\), or lch\(\)/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtmlFromPlan renders approved plans in one document call", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const longPlan = validPlan(14, 14);
  const longBody = "BODY_DETAIL_SHOULD_BE_COMPACTED ".repeat(160);
  const longEvidence = "EVIDENCE_DETAIL_SHOULD_BE_COMPACTED ".repeat(120);
  const longVisualDirection = "VISUAL_DETAIL_SHOULD_BE_COMPACTED ".repeat(90);
  longPlan.slides = longPlan.slides.map((slide) => ({
    ...slide,
    body: longBody,
    evidence: longEvidence,
    sourceAnchors: Array.from({ length: 10 }, (_, index) => `anchor ${index + 1}`),
    visualDirection: longVisualDirection,
  }));
  setQueuedGemini([
    geminiJsonResponse({ document: validEbookDocument("Single pass", 14) }),
  ], calls, requestBodies);

  try {
    const result = await generateEbookHtmlFromPlan(baseArgs, longPlan);

    type HtmlRequestBody = {
      generationConfig?: { httpOptions?: { timeout?: number } };
      contents?: { parts?: { text?: string }[] }[];
    };
    const htmlRequests = requestBodies.slice(0, 1) as HtmlRequestBody[];
    const htmlPrompts = htmlRequests.map((request) => request.contents?.[0]?.parts?.[0]?.text ?? "");

    assert.equal(calls.length, 1);
    assert.ok(calls.every((call) => call.includes("/models/gemini-3.1-pro-preview:generateContent")));
    assert.ok(htmlRequests.every((request) => request.generationConfig?.httpOptions === undefined));
    assert.ok(result.ebookDocument);
    assert.equal(result.ebookDocument.pages.length, 14);
    assert.equal(result.generationTrace.length, 1);
    assert.deepEqual(result.generationTrace.map((trace) => trace.status), ["success"]);
    assert.deepEqual(result.generationTrace.map((trace) => [trace.slideStart, trace.slideEnd]), [[1, 14]]);
    assert.deepEqual(result.generationTrace.map((trace) => trace.pageCount), [14]);
    assert.ok(result.generationTrace.every((trace) => trace.durationMs !== undefined && trace.durationMs >= 0));
    assert.ok(result.generationTrace.every((trace) => trace.promptLength > 0));
    assert.equal(result.generationTrace[0]?.slideHeadlines[13], "Source-led decision 14");
    assert.deepEqual(result.ebookDocument.pages.map((page) => page.id), Array.from({ length: 14 }, (_, index) => `page-${index + 1}`));
    assert.match(result.html, /Single pass 14/i);

    assert.doesNotMatch(htmlPrompts[0] ?? "", /Batch 1 of/);
    assert.match(htmlPrompts[0] ?? "", /Source-led decision 1/);
    assert.match(htmlPrompts[0] ?? "", /Source-led decision 14/);

    assert.match(htmlPrompts[0] ?? "", /BODY_DETAIL_SHOULD_BE_COMPACTED/);
    assert.match(htmlPrompts[0] ?? "", new RegExp(longBody.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(htmlPrompts[0] ?? "", new RegExp(longEvidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(htmlPrompts[0] ?? "", new RegExp(longVisualDirection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(htmlPrompts[0] ?? "", /anchor 9/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("ebook plan prompt matches the legacy 8-14 slide plan budget", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  const longSource = Array.from({ length: 120 }, (_, index) =>
    `## Section ${index + 1}\nThis source section includes a concrete method, warning, example, and detail that should not be collapsed into one tiny summary.`,
  ).join("\n\n");
  setQueuedGemini([
    geminiJsonResponse(validPlan(14, 14)),
    geminiJsonResponse({ document: validEbookDocument("Source-led decision", 14) }),
  ], calls, requestBodies);

  try {
    await generateEbookHtml({ ...baseArgs, sourceText: longSource });
    const planRequest = requestBodies[0] as {
      contents?: { parts?: { text?: string }[] }[];
    };
    const planPrompt = planRequest.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.match(planPrompt, /Make 8-14 slides total in one self-contained deck/);
    assert.match(planPrompt, /Plan requirements/);
    assert.doesNotMatch(planPrompt, /recommendedSlideCount|capped at 14|lead magnet|Source scale|Recommended slide budget: 18-22 slides|Do not compress a long source into 10 slides/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml renders the normalized plan in a single HTML request", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedGemini([
    geminiJsonResponse(validPlan(14, 14)),
    geminiJsonResponse({ document: validEbookDocument("Founder decision", 14) }),
  ], [], requestBodies);

  try {
    const html = await generateEbookHtml(baseArgs);
    const htmlRequest = requestBodies[1] as {
      contents?: { parts?: { text?: string }[] }[];
    };
    const htmlPrompt = htmlRequest.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.equal(requestBodies.length, 2);
    assert.match(html, /Founder decision 14/);
    assert.match(html, /data-slide="14"/);
    const headlines = htmlPrompt.match(/Source-led decision \d+/g) ?? [];
    assert.equal(headlines.length, 14);
    assert.ok(headlines.includes("Source-led decision 1"));
    assert.ok(headlines.includes("Source-led decision 14"));
    assert.doesNotMatch(htmlPrompt, /Batch 1 of/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
