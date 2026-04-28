import assert from "node:assert/strict";
import test from "node:test";
import { isTiptapBookDocument, textFromDoc } from "./tiptap-document";
import { getEbookPageCountForHtml, withSavedProjectDocument } from "./projects";
import { withGeneratedProject, withRevisedProject } from "./project-generation";
import type { ProjectRecord } from "@/types/project";

function projectFixture(): ProjectRecord {
  return {
    id: "project-1",
    kind: "product",
    title: "Editable project",
    status: "draft",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    sources: [],
    profile: {
      author: "",
      targetAudience: "Founders",
      purpose: "Message",
      designMode: "balanced",
      pageFormat: "ebook",
      customPageSize: { widthMm: 152, heightMm: 229 },
      tone: "",
      plan: null,
      document: [],
      ebookStyle: null,
      ebookHtml: null,
      ebookPageCount: 16,
      accentColor: "#6366f1",
    },
  };
}

function firstDoc(project: ProjectRecord) {
  assert.ok(isTiptapBookDocument(project.profile.document));
  return project.profile.document.pages[0]!.doc;
}

test("withSavedProjectDocument preserves normalized Tiptap document JSON", () => {
  const project = withSavedProjectDocument(projectFixture(), {
    type: "doc",
    content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Updated <copy>" }] }],
  });

  assert.equal(project.status, "ready");
  assert.equal(firstDoc(project).content?.[0]?.type, "heading");
  assert.equal(textFromDoc(firstDoc(project)), "Updated <copy>");
});

test("getEbookPageCountForHtml reflects current Celion slide count", () => {
  assert.equal(getEbookPageCountForHtml("<div>No slides yet</div>"), 1);
  assert.equal(
    getEbookPageCountForHtml(`
      <div class="slide" data-slide="1"></div>
      <div class="slide" data-slide="2"></div>
      <div class="slide-footer"></div>
    `),
    2,
  );
});

test("withSavedProjectDocument preserves an intentionally empty Tiptap document", () => {
  const project = withSavedProjectDocument(
    {
      ...projectFixture(),
      profile: {
        ...projectFixture().profile,
        plan: {
          hook: "Do not regenerate this.",
          chapters: [
            {
              id: "ch-1",
              title: "Existing plan",
              summary: "Should not become document content during a save.",
              keyPoints: ["Keep empty"],
            },
          ],
        },
      },
    },
    [],
  );

  assert.ok(isTiptapBookDocument(project.profile.document));
  assert.equal(textFromDoc(firstDoc(project)).trim(), "");
});

test("withSavedProjectDocument migrates legacy block-shaped input", () => {
  const project = withSavedProjectDocument(projectFixture(), {
    version: 1,
    blocks: [
      {
        id: "legacy-1",
        type: "paragraph",
        content: {
          title: "Legacy heading",
          body: ["Legacy <body>"],
        },
      },
    ],
  });

  assert.ok(isTiptapBookDocument(project.profile.document));
  assert.equal(textFromDoc(firstDoc(project)), "");
});

test("withGeneratedProject ensures a missing plan before deterministic fallback generation", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await withGeneratedProject(projectFixture());

    assert.equal(result.generation.source, "fallback");
    assert.equal(result.generation.fallbackReason, "missing-api-key");
    assert.ok(result.project.profile.plan);
    assert.ok(textFromDoc(firstDoc(result.project)).length > 0);
    assert.equal(result.project.status, "ready");
    assert.equal(firstDoc(result.project).content?.[0]?.type, "heading");
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("withGeneratedProject accepts AI Tiptap JSON before saving", async () => {
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
                    type: "doc",
                    content: [
                      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "AI <copy>" }] },
                    ],
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
    const result = await withGeneratedProject({
      ...projectFixture(),
      profile: {
        ...projectFixture().profile,
        plan: {
          hook: "A working plan.",
          chapters: [
            {
              id: "ch-1",
              title: "Chapter",
              summary: "Summary",
              keyPoints: ["Point"],
            },
          ],
        },
      },
    });

    assert.equal(result.generation.source, "ai");
    assert.equal(firstDoc(result.project).content?.length, 1);
    assert.equal(firstDoc(result.project).content?.[0]?.type, "heading");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("withRevisedProject replaces document with AI revised Tiptap JSON", async () => {
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
                    type: "doc",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Revised <copy>" }] }],
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
    const result = await withRevisedProject(
      {
        ...projectFixture(),
        profile: {
          ...projectFixture().profile,
          plan: {
            hook: "A working plan.",
            chapters: [
              {
                id: "ch-1",
                title: "Chapter",
                summary: "Summary",
                keyPoints: ["Point"],
              },
            ],
          },
          document: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Old copy" }] }],
          },
        },
      },
      "Make it sharper.",
    );

    assert.equal(result.project.revisionPrompt, "Make it sharper.");
    assert.equal(textFromDoc(firstDoc(result.project)), "Revised <copy>");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
