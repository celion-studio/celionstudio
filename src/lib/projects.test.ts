import assert from "node:assert/strict";
import test from "node:test";
import { withSavedProjectBlocks } from "./projects";
import { withGeneratedProject, withRevisedProject } from "./project-generation";
import type { ProjectRecord } from "@/types/project";

function projectFixture(): ProjectRecord {
  return {
    id: "project-1",
    title: "Editable project",
    status: "draft",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    sources: [],
    html: "<p>stale html</p>",
    profile: {
      author: "",
      targetAudience: "Founders",
      coreMessage: "Message",
      designMode: "balanced",
      pageFormat: "ebook",
      customPageSize: { widthMm: 152, heightMm: 229 },
      goal: "",
      depth: "",
      tone: "",
      structureStyle: "",
      readerLevel: "",
      plan: null,
      blocks: [],
    },
  };
}

test("withSavedProjectBlocks preserves BlockNote document JSON and regenerates escaped HTML", () => {
  const project = withSavedProjectBlocks(projectFixture(), [
    {
      id: "block-1",
      type: "heading",
      props: { level: 2 },
      content: "Updated <copy>",
    },
    {
      id: "bad-html",
      type: "html",
      content: "<iframe />",
    },
  ]);

  assert.equal(project.status, "ready");
  assert.equal(project.profile.blocks.length, 1);
  assert.equal(project.profile.blocks[0].id, "block-1");
  assert.equal(project.profile.blocks[0].type, "heading");
  assert.ok(project.html.includes("Updated &lt;copy&gt;"));
  assert.ok(!project.html.includes("stale html"));
  assert.ok(!project.html.includes("<iframe"));
});

test("withSavedProjectBlocks preserves an intentionally empty BlockNote document", () => {
  const project = withSavedProjectBlocks(
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
              summary: "Should not become blocks during a save.",
              keyPoints: ["Keep empty"],
            },
          ],
        },
      },
    },
    [],
  );

  assert.equal(project.profile.blocks.length, 0);
  assert.ok(project.html.includes("<main></main>"));
  assert.ok(!project.html.includes("Existing plan"));
});

test("withSavedProjectBlocks rejects non-BlockNote legacy-shaped input", () => {
  const project = withSavedProjectBlocks(projectFixture(), {
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

  assert.equal(project.profile.blocks.length, 0);
  assert.ok(project.html.includes("<main></main>"));
  assert.ok(!project.html.includes("Legacy heading"));
});

test("withSavedProjectBlocks exports nested children, images, and tables", () => {
  const project = withSavedProjectBlocks(projectFixture(), [
    {
      type: "heading",
      props: { level: 2 },
      content: "Media chapter",
      children: [{ type: "paragraph", content: "Nested <note>" }],
    },
    {
      type: "image",
      props: {
        url: "https://example.com/chart.png",
        caption: "Chart <caption>",
        name: "Chart",
      },
    },
    {
      type: "table",
      content: {
        type: "tableContent",
        headerRows: 1,
        rows: [
          { cells: [["Metric"], ["Value"]] },
          { cells: [["Readers"], ["42 <people>"]] },
        ],
      },
    },
  ]);

  assert.equal(project.profile.blocks.length, 3);
  assert.ok(project.html.includes("Nested &lt;note&gt;"));
  assert.ok(project.html.includes('<img src="https://example.com/chart.png"'));
  assert.ok(project.html.includes("Chart &lt;caption&gt;"));
  assert.ok(project.html.includes("<table>"));
  assert.ok(project.html.includes("<th>Metric</th>"));
  assert.ok(project.html.includes("<td>42 &lt;people&gt;</td>"));
});

test("withSavedProjectBlocks renders the selected page format for export", () => {
  const project = withSavedProjectBlocks(
    {
      ...projectFixture(),
      profile: {
        ...projectFixture().profile,
        pageFormat: "a3",
      },
    },
    [{ type: "paragraph", content: "A3 ready" }],
  );

  assert.ok(project.html.includes("@page { size: 297mm 420mm;"));
  assert.ok(project.html.includes("A3 ready"));
});

test("withSavedProjectBlocks renders custom ebook page sizes for export", () => {
  const project = withSavedProjectBlocks(
    {
      ...projectFixture(),
      profile: {
        ...projectFixture().profile,
        pageFormat: "custom",
        customPageSize: { widthMm: 140, heightMm: 210 },
      },
    },
    [{ type: "paragraph", content: "Custom ready" }],
  );

  assert.ok(project.html.includes("@page { size: 140mm 210mm;"));
  assert.ok(project.html.includes("Custom ready"));
});

test("withGeneratedProject ensures a missing plan before deterministic fallback generation", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await withGeneratedProject(projectFixture());

    assert.equal(result.generation.source, "fallback");
    assert.equal(result.generation.fallbackReason, "missing-api-key");
    assert.ok(result.project.profile.plan);
    assert.ok(result.project.profile.blocks.length > 0);
    assert.equal(result.project.status, "ready");
    assert.equal(result.project.profile.blocks[0].type, "heading");
    assert.ok(result.project.html.includes("Editable project"));
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("withGeneratedProject accepts AI BlockNote JSON before saving and rendering", async () => {
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
                    blocks: [
                      {
                        id: "ai-heading",
                        type: "heading",
                        props: { level: 2 },
                        content: "AI <copy>",
                      },
                      {
                        id: "bad",
                        type: "html",
                        content: "<iframe />",
                      },
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
    assert.equal(result.project.profile.blocks.length, 1);
    assert.equal(result.project.profile.blocks[0].id, "ai-heading");
    assert.equal(result.project.profile.blocks[0].type, "heading");
    assert.ok(result.project.html.includes("AI &lt;copy&gt;"));
    assert.ok(!result.project.html.includes("<iframe"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test("withRevisedProject replaces blocks with AI revised BlockNote JSON", async () => {
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
                    blocks: [
                      {
                        id: "revised",
                        type: "paragraph",
                        content: "Revised <copy>",
                      },
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
          blocks: [{ id: "old", type: "paragraph", content: "Old copy" }],
        },
      },
      "Make it sharper.",
    );

    assert.equal(result.project.revisionPrompt, "Make it sharper.");
    assert.equal(result.project.profile.blocks.length, 1);
    assert.equal(result.project.profile.blocks[0].id, "revised");
    assert.ok(result.project.html.includes("Revised &lt;copy&gt;"));
    assert.ok(!result.project.html.includes("Old copy"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});
