import assert from "node:assert/strict";
import test from "node:test";
import { EbookGenerationError, generateEbookHtml, generateEbookHtmlWithDiagnostics } from "./ebook-generation";
import type { CelionEbookDocument } from "./ebook-document";

function muteConsoleWarn() {
  const originalWarn = console.warn;
  console.warn = () => {};
  return () => {
    console.warn = originalWarn;
  };
}

function validBlueprint(slideCount = 10, recommendedSlideCount = slideCount) {
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

function validEbookDocument(titlePrefix = "Founder decision"): CelionEbookDocument {
  return {
    version: 1,
    title: "Source-led guide",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    pages: Array.from({ length: 10 }, (_, index) => {
      const pageId = `page-${index + 1}`;
      const titleId = `${pageId}-title`;
      const bodyId = `${pageId}-body`;
      return {
        id: pageId,
        index,
        title: `${titlePrefix} ${index + 1}`,
        role: index === 0 ? "cover" : index === 9 ? "cta" : "insight",
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

function setQueuedFetch(responses: Response[], calls: string[] = [], requestBodies: unknown[] = []) {
  globalThis.fetch = (async (input, init) => {
    calls.push(String(input));
    requestBodies.push(JSON.parse(String(init?.body)));
    const response = responses.shift();
    if (!response) throw new Error("No mocked response queued.");
    return response;
  }) as typeof fetch;
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

test("generateEbookHtml throws instead of saving fallback when blueprint Gemini is unavailable", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ error: { status: "UNAVAILABLE", message: "This model is currently experiencing high demand." } }),
      { status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

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
    globalThis.fetch = (async () => {
      throw new Error(sensitiveSource);
    }) as typeof fetch;
    await assert.rejects(() => generateEbookHtml(args), /AI ebook planning failed/);

    setQueuedFetch([
      geminiJsonResponse(validBlueprint()),
      geminiJsonResponse({}),
    ]);
    await assert.rejects(() => generateEbookHtml(args), /Gemini did not return an ebook document/);

    setQueuedFetch([
      geminiJsonResponse(validBlueprint()),
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

test("generateEbookHtml surfaces blueprint Gemini rate limits as retryable generation errors", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for this model." } }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

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
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
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

test("generateEbookHtml rejects invalid blueprints before HTML generation", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  const calls: string[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedFetch([geminiJsonResponse({ slides: [] })], calls);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      /blueprint with only 0 usable slides/,
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
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
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
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
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

  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);

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

  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);
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
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ document: validEbookDocument("Source-led insight") }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);

    assert.match(result.html, /class="slide celion-page-shell"/);
    assert.match(result.html, /data-slide="1"/);
    assert.equal(result.diagnostics.ebookDocument.version, 1);
    assert.equal(result.diagnostics.ebookDocument.pages.length, 10);
    assert.equal(result.diagnostics.ebookDocument.pages[0]?.id, "page-1");
  } finally {
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
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ document }),
  ]);

  try {
    const result = await generateEbookHtmlWithDiagnostics(baseArgs);
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

test("ebook generation uses Flash-Lite for blueprint and Pro for document design", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ document: validEbookDocument() }),
  ], calls, requestBodies);

  try {
    await generateEbookHtml({ ...baseArgs, tone: "practical" });

    assert.ok(calls[0]?.includes("/models/gemini-2.5-flash-lite:generateContent"));
    assert.ok(calls[1]?.includes("/models/gemini-3.1-pro-preview:generateContent"));
    const blueprintRequest = requestBodies[0] as {
      generationConfig?: { temperature?: number };
      system_instruction?: { parts?: { text?: string }[] };
      contents?: { parts?: { text?: string }[] }[];
    };
    const htmlRequest = requestBodies[1] as typeof blueprintRequest;
    const blueprintSystem = blueprintRequest.system_instruction?.parts?.[0]?.text ?? "";
    const blueprintPrompt = blueprintRequest.contents?.[0]?.parts?.[0]?.text ?? "";
    const htmlSystem = htmlRequest.system_instruction?.parts?.[0]?.text ?? "";
    const htmlPrompt = htmlRequest.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.equal(blueprintRequest.generationConfig?.temperature, 0.75);
    assert.equal(htmlRequest.generationConfig?.temperature, 1);
    assert.match(blueprintSystem, /senior editorial strategist/);
    assert.match(blueprintPrompt, /Create a source-led A5 slide publication blueprint/);
    assert.match(blueprintPrompt, /Purpose \/ use case/);
    assert.match(blueprintPrompt, /Source material/);
    assert.match(blueprintPrompt, /sourceAssessment/);
    assert.match(blueprintPrompt, /recommendedSlideCount/);
    assert.match(blueprintPrompt, /sourceAnchors/);
    assert.doesNotMatch(blueprintPrompt, /Reader and product brief|sellable publication/);
    assert.match(htmlSystem, /approved editorial blueprint/);
    assert.match(htmlPrompt, /Approved blueprint/);
    assert.match(htmlPrompt, /Source-led decision 1/);
    assert.match(htmlPrompt, /Technical contract/);
    assert.match(htmlPrompt, /24px vertical space between major content groups/);
    assert.match(htmlPrompt, /line-height 1\.55-1\.75/);
    assert.match(htmlPrompt, /If content feels crowded, shorten the copy/);
    assert.match(htmlPrompt, /Output only JSON with one "document" field/);
    assert.match(htmlPrompt, /Generate all pages in one response/);
    assert.match(htmlPrompt, /data-celion-page="\{pageId\}"/);
    assert.match(htmlPrompt, /Never put style="" attributes in HTML/);
    assert.match(htmlPrompt, /Every page CSS selector starts with \[data-celion-page="\{pageId\}"\]/);
    assert.match(htmlPrompt, /Manifest includes every editable element/);
    assert.doesNotMatch(htmlPrompt, /# Market/);
    assert.doesNotMatch(blueprintPrompt, /Core message:/);
    assert.doesNotMatch(htmlPrompt, /Why this matters now|The core idea|How to apply it/);
    assert.match(htmlPrompt, /Do not use color\(\), color-mix\(\), oklch\(\), lab\(\), or lch\(\)/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("ebook blueprint prompt expands the slide budget for long source material", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  const longSource = Array.from({ length: 120 }, (_, index) =>
    `## Section ${index + 1}\nThis source section includes a concrete method, warning, example, and detail that should not be collapsed into one tiny summary.`,
  ).join("\n\n");
  setQueuedFetch([
    geminiJsonResponse(validBlueprint(20, 20)),
    geminiJsonResponse({ document: validEbookDocument() }),
  ], calls, requestBodies);

  try {
    await generateEbookHtml({ ...baseArgs, sourceText: longSource });
    const blueprintRequest = requestBodies[0] as {
      contents?: { parts?: { text?: string }[] }[];
    };
    const blueprintPrompt = blueprintRequest.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.match(blueprintPrompt, /Recommended slide budget: 18-22 slides/);
    assert.match(blueprintPrompt, /The blueprint must choose recommendedSlideCount after assessing the source/);
    assert.match(blueprintPrompt, /Do not compress a long source into 10 slides/);
    assert.doesNotMatch(blueprintPrompt, /Make 8-14 slides total/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml rejects blueprints that ignore their own recommended slide count", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedFetch([
    geminiJsonResponse(validBlueprint(10, 20)),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      /recommended 20 slides but only returned 10/,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
