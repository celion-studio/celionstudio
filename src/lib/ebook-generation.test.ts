import assert from "node:assert/strict";
import test from "node:test";
import { generateEbookHtml } from "./ebook-generation";

function muteConsoleWarn() {
  const originalWarn = console.warn;
  console.warn = () => {};
  return () => {
    console.warn = originalWarn;
  };
}

function validBlueprint() {
  return {
    title: "Source-led guide",
    subtitle: "A practical guide from the source",
    author: "Celion",
    targetAudience: "founders",
    readerPromise: "Make the source useful.",
    language: "English",
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
    slides: Array.from({ length: 10 }, (_, index) => ({
      role: index === 0 ? "cover" : index === 9 ? "cta" : "insight",
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

function validSlideHtml(titlePrefix = "Founder decision") {
  return `<!doctype html><html><head><style>@page { size: 148mm 210mm; margin: 0; }.slide{width:559px;height:794px;overflow:hidden;page-break-after:always;}</style></head><body>${Array.from({ length: 12 }, (_, index) => `<div class="slide" data-slide="${index + 1}"><h1>${titlePrefix} ${index + 1}</h1><p>${"Useful ebook content ".repeat(12)}</p></div>`).join("")}</body></html>`;
}

function validPageHtml() {
  return `<!doctype html><html><head><style>@page { size: 148mm 210mm; margin: 0; }.page{width:559px;height:794px;overflow:hidden;page-break-after:always;}.page-number{color:#111}</style></head><body>${Array.from({ length: 10 }, (_, index) => `<div class="page" data-page="${index + 1}"><h1>Source-led insight ${index + 1}</h1><span class="page-number">${index + 1}</span><p>${"Useful ebook content ".repeat(14)}</p></div>`).join("")}</body></html>`;
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
    await assert.rejects(() => generateEbookHtml(args), /Gemini did not return an HTML document/);

    setQueuedFetch([
      geminiJsonResponse(validBlueprint()),
      geminiJsonResponse({ html: "<html><body>No usable slides</body></html>" }),
    ]);
    await assert.rejects(() => generateEbookHtml(args), /did not pass Celion ebook validation/);

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

test("generateEbookHtml surfaces HTML Gemini rate limits as retryable generation errors", async () => {
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

test("generateEbookHtml rejects structurally unusable Gemini HTML with validation details", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ html: "<!doctype html><html><head><style>.slide{}</style></head><body><div class=\"slide\"></div></body></html>" }),
  ]);

  try {
    await assert.rejects(
      () => generateEbookHtml(baseArgs),
      /Output must include at least 8 .slide elements/,
    );
  } finally {
    restoreWarn();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml keeps structurally valid Gemini HTML even with generic heading warnings", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  const restoreWarn = muteConsoleWarn();
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ html: validSlideHtml("The core idea") }),
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

test("generateEbookHtml normalizes page/data-page HTML into Celion slide HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ html: validPageHtml() }),
  ]);

  try {
    const html = await generateEbookHtml(baseArgs);

    assert.match(html, /class="slide"/);
    assert.match(html, /data-slide="1"/);
    assert.match(html, /\.page-number/);
    assert.doesNotMatch(html, /data-page=/);
    assert.doesNotMatch(html, /class="page"/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("ebook generation uses Flash-Lite for blueprint and Pro for HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  setQueuedFetch([
    geminiJsonResponse(validBlueprint()),
    geminiJsonResponse({ html: validSlideHtml() }),
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
    assert.match(blueprintPrompt, /sourceAnchors/);
    assert.doesNotMatch(blueprintPrompt, /Reader and product brief|sellable publication/);
    assert.match(htmlSystem, /approved editorial blueprint/);
    assert.match(htmlPrompt, /Approved blueprint/);
    assert.match(htmlPrompt, /Source-led decision 1/);
    assert.match(htmlPrompt, /Technical contract/);
    assert.match(htmlPrompt, /24px vertical space between major content groups/);
    assert.match(htmlPrompt, /line-height 1\.55-1\.75/);
    assert.match(htmlPrompt, /If content feels crowded, shorten the copy/);
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
