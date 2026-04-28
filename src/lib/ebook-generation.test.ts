import assert from "node:assert/strict";
import test from "node:test";
import { generateEbookHtml } from "./ebook-generation";

test("generateEbookHtml falls back to editable paged HTML when Gemini is unavailable", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          status: "UNAVAILABLE",
          message: "This model is currently experiencing high demand.",
        },
      }),
      { status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const html = await generateEbookHtml({
      title: "Fallback ebook",
      author: "Celion",
      coreMessage: "Make the source useful.",
      targetAudience: "founders",
      sourceText: "# Market\n\nA useful market note with enough length to become a paragraph.",
      ebookStyle: "minimal",
      accentColor: "#111111",
    });

    assert.match(html, /<!doctype html>/i);
    assert.match(html, /class="slide cover style-minimal"/);
    assert.match(html, /<div class="slide/);
    assert.match(html, /@page \{ size: 148mm 210mm; margin: 0; \}/);
    assert.match(html, /width: 559px/);
    assert.match(html, /height: 794px/);
    assert.match(html, /overflow: hidden/);
    assert.match(html, /aspect-ratio: 559 \/ 794/);
    assert.match(html, /slide-header/);
    assert.match(html, /slide-footer/);
    assert.match(html, /code-block/);
    assert.match(html, /locked-teaser/);
    assert.match(html, /cta-panel/);
    assert.match(html, /style-minimal/);
    assert.match(html, /data-text-editable="true"/);
    assert.match(html, /Fallback ebook/);
    assert.doesNotMatch(html, /color-mix|oklch|lab\(|lch\(|color\(/i);
    assert.doesNotMatch(html, /쨌|횞|\?\?/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml fallback carries distinct selected style CSS", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = (async () => new Response("{}", { status: 503 })) as typeof fetch;

  try {
    const html = await generateEbookHtml({
      title: "Brutal ebook",
      author: "Celion",
      coreMessage: "Make the source useful.",
      targetAudience: "founders",
      sourceText: "# Market\n\nA useful market note with enough length to become a paragraph.",
      ebookStyle: "neo-brutalism",
      accentColor: "#ffcc00",
    });

    assert.match(html, /style-neo-brutalism/);
    assert.match(html, /border: 4px solid #111111/);
    assert.match(html, /#ffcc00/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("generateEbookHtml falls back when Gemini returns unusable HTML", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    html: "<!doctype html><html><head><style>.slide{}</style></head><body><div class=\"slide\"></div></body></html>",
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const html = await generateEbookHtml({
      title: "Fallback from weak HTML",
      author: "Celion",
      coreMessage: "Make the source useful.",
      targetAudience: "founders",
      sourceText: "# Market\n\nA useful market note with enough length to become a paragraph.",
      ebookStyle: "editorial",
      accentColor: "#111111",
    });

    assert.match(html, /Fallback from weak HTML/);
    assert.match(html, /style-editorial/);
    assert.match(html, /visual-mark/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("ebook generation uses Gemini 3.1 Pro Preview", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const calls: string[] = [];
  const requestBodies: unknown[] = [];
  process.env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    calls.push(String(input));
    requestBodies.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    html: `<!doctype html><html><head><style>@page { size: 148mm 210mm; margin: 0; }.slide{width:559px;height:794px;overflow:hidden;page-break-after:always;}</style></head><body>${Array.from({ length: 12 }, (_, index) => `<div class="slide" data-slide="${index + 1}"><h1>Slide ${index + 1}</h1><p>${"Useful ebook content ".repeat(8)}</p></div>`).join("")}</body></html>`,
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await generateEbookHtml({
      title: "Model check",
      author: "Celion",
      coreMessage: "Make the source useful.",
      targetAudience: "founders",
      sourceText: "# Market\n\nNotes",
      ebookStyle: "minimal",
      accentColor: "#111111",
    });

    assert.ok(calls.some((url) => url.includes("/models/gemini-3.1-pro-preview:generateContent")));
    const requestBody = requestBodies[0] as {
      generationConfig?: { temperature?: number };
      system_instruction?: { parts?: { text?: string }[] };
      contents?: { parts?: { text?: string }[] }[];
    };
    const systemPrompt = requestBody.system_instruction?.parts?.[0]?.text ?? "";
    const userPrompt = requestBody.contents?.[0]?.parts?.[0]?.text ?? "";

    assert.equal(requestBody.generationConfig?.temperature, 0.65);
    assert.match(systemPrompt, /A5 HTML\/CSS slide document/);
    assert.match(systemPrompt, /Celion A5 Slide HTML format/);
    assert.match(systemPrompt, /Creative autonomy/);
    assert.match(userPrompt, /Generate a complete HTML\/CSS A5 slide preview/);
    assert.match(userPrompt, /Hard requirements/);
    assert.match(userPrompt, /Creative brief/);
    assert.match(userPrompt, /paid-product free preview/);
    assert.match(userPrompt, /Suggested preview journey, not a fixed outline/);
    assert.match(userPrompt, /Choose the final slide count yourself/);
    assert.doesNotMatch(userPrompt, /Target slide count/);
    assert.doesNotMatch(userPrompt, /\(\d+ slides\)/);
    assert.match(userPrompt, /header\/footer chrome per slide based on orientation and style/);
    assert.match(userPrompt, /Do not use color\(\), color-mix\(\), oklch\(\), lab\(\), or lch\(\)/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
