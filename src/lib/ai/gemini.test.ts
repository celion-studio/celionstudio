import assert from "node:assert/strict";
import test from "node:test";
import { GeminiProviderError, generateJsonWithGemini } from "./gemini";

test("generateJsonWithGemini fails before fetch when GEMINI_API_KEY is missing", async () => {
  let fetchCalled = false;
  const fetchFn: typeof fetch = async () => {
    fetchCalled = true;
    return new Response("{}");
  };

  await assert.rejects(
    generateJsonWithGemini({
      system: "Return JSON only.",
      user: "Build a document.",
      env: { GEMINI_API_KEY: "" },
      fetchFn,
    }),
    (error) =>
      error instanceof GeminiProviderError && error.code === "GEMINI_API_KEY_MISSING",
  );

  assert.equal(fetchCalled, false);
});

test("generateJsonWithGemini extracts JSON from a mocked Gemini response", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{"type":"doc","content":[{"type":"paragraph"}]}\n```',
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const parsed = await generateJsonWithGemini({
    system: "Return JSON only.",
    user: "Build a document.",
    env: { GEMINI_API_KEY: "test-key" },
    fetchFn,
    baseUrl: "https://example.test/",
    model: "gemini-test",
  });

  assert.deepEqual(parsed, {
    type: "doc",
    content: [{ type: "paragraph" }],
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.test/v1beta/models/gemini-test:generateContent");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(new Headers(calls[0].init?.headers).get("x-goog-api-key"), "test-key");

  const body = JSON.parse(String(calls[0].init?.body)) as {
    generationConfig: { response_mime_type: string };
  };
  assert.equal(body.generationConfig.response_mime_type, "application/json");
});
