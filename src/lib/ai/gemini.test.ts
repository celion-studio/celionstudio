import assert from "node:assert/strict";
import test from "node:test";
import {
  GeminiProviderError,
  generateJsonWithGemini,
  setGeminiClientFactoryForTests,
} from "./gemini";

test("generateJsonWithGemini fails before generation when Vertex project is missing", async () => {
  let generateCalled = false;
  setGeminiClientFactoryForTests(() => ({
    models: {
      async generateContent() {
        generateCalled = true;
        return { text: "{}" };
      },
    },
  }));

  try {
    await assert.rejects(
      generateJsonWithGemini({
        system: "Return JSON only.",
        user: "Build a document.",
        env: {},
      }),
      (error) =>
        error instanceof GeminiProviderError && error.code === "GEMINI_PROJECT_MISSING",
    );

    assert.equal(generateCalled, false);
  } finally {
    setGeminiClientFactoryForTests(undefined);
  }
});

test("generateJsonWithGemini calls the Google Gen AI SDK with Vertex options", async () => {
  const clientOptions: unknown[] = [];
  const calls: unknown[] = [];
  setGeminiClientFactoryForTests((options) => {
    clientOptions.push(options);
    return {
      models: {
        async generateContent(params) {
          calls.push(params);
          return {
            text: '```json\n{"type":"doc","content":[{"type":"paragraph"}]}\n```',
          };
        },
      },
    };
  });

  try {
    const parsed = await generateJsonWithGemini({
      system: "Return JSON only.",
      user: "Build a document.",
      env: {
        GOOGLE_CLOUD_PROJECT: "celion-test",
      },
      model: "gemini-test",
    });

    assert.deepEqual(parsed, {
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    assert.deepEqual(clientOptions[0], {
      vertexai: true,
      project: "celion-test",
      location: "global",
    });
    assert.deepEqual(calls[0], {
      model: "gemini-test",
      contents: "Build a document.",
      config: {
        systemInstruction: "Return JSON only.",
        responseMimeType: "application/json",
        temperature: 0.2,
        httpOptions: {
          timeout: 120000,
        },
      },
    });
  } finally {
    setGeminiClientFactoryForTests(undefined);
  }
});

test("generateJsonWithGemini configures Vercel OIDC Workload Identity Federation", async () => {
  const clientOptions: unknown[] = [];
  setGeminiClientFactoryForTests((options) => {
    clientOptions.push(options);
    return {
      models: {
        async generateContent() {
          return { text: '{"ok":true}' };
        },
      },
    };
  });

  try {
    await generateJsonWithGemini({
      system: "Return JSON only.",
      user: "Build a document.",
      env: {
        GCP_PROJECT_ID: "celion-prod",
        GCP_PROJECT_NUMBER: "123456789012",
        GCP_SERVICE_ACCOUNT_EMAIL: "vercel@celion-prod.iam.gserviceaccount.com",
        GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel",
        GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
      },
    });

    const options = clientOptions[0] as {
      googleAuthOptions?: { authClient?: unknown; projectId?: string };
    };
    assert.equal(options.googleAuthOptions?.projectId, "celion-prod");
    assert.ok(options.googleAuthOptions?.authClient);
  } finally {
    setGeminiClientFactoryForTests(undefined);
  }
});

test("generateJsonWithGemini maps Vertex auth failures", async () => {
  setGeminiClientFactoryForTests(() => ({
    models: {
      async generateContent() {
        const error = new Error("permission denied") as Error & { status: number };
        error.status = 403;
        throw error;
      },
    },
  }));

  try {
    await assert.rejects(
      generateJsonWithGemini({
        system: "Return JSON only.",
        user: "Build a document.",
        env: { GOOGLE_CLOUD_PROJECT: "celion-test" },
      }),
      (error) => error instanceof GeminiProviderError && error.code === "GEMINI_AUTH_ERROR",
    );
  } finally {
    setGeminiClientFactoryForTests(undefined);
  }
});
