import assert from "node:assert/strict";
import test from "node:test";
import type { getSql } from "./db";
import { listEbookGenerationLogsForProject } from "./ebook-generation-logs";
import {
  deleteProjectForUser,
  getEbookPageCountForHtml,
  listDeletedProjectSummariesForUser,
  listProjectSummariesForUser,
  profileFromRow,
  restoreProjectForUser,
  trashProjectForUser,
} from "./projects";

type ProjectTestSql = ReturnType<typeof getSql>;

function createProjectSql(rows: unknown[] = []) {
  const statements: string[] = [];
  const sql = (async (strings: TemplateStringsArray) => {
    statements.push(strings.join("?").replace(/\s+/g, " ").trim());
    return rows;
  }) as unknown as ProjectTestSql;

  return { sql, statements };
}

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

test("profileFromRow normalizes stored ebook document JSON", () => {
  const profile = profileFromRow({
    projectId: "project-1",
    targetAudience: "Founders",
    tone: "Clear",
    author: "Ada",
    purpose: "Teach",
    designMode: "balanced",
    ebookStyle: "minimal",
    ebookHtml: "<div></div>",
    ebookDocument: {
      title: "Stored book",
      size: { width: 600, height: 800, unit: "px" },
      pages: [{ id: "cover", html: "<section></section>" }],
    },
    ebookPageCount: 1,
    accentColor: "#111111",
  });

  assert.equal(profile.ebookDocument?.version, 1);
  assert.equal(profile.ebookDocument?.title, "Stored book");
  assert.equal(profile.ebookDocument?.pages[0]?.id, "cover");
  assert.equal(profile.ebookDocument?.pages[0]?.title, "Page 1");
});

test("profileFromRow ignores empty or malformed ebook document JSON", () => {
  for (const ebookDocument of [{}, [], "null", { pages: [] }]) {
    const profile = profileFromRow({
      projectId: "project-1",
      targetAudience: "Founders",
      tone: "Clear",
      author: "Ada",
      purpose: "Teach",
      designMode: "balanced",
      ebookStyle: "minimal",
      ebookHtml: "<div></div>",
      ebookDocument,
      ebookPageCount: 1,
      accentColor: "#111111",
    });

    assert.equal(profile.ebookDocument, null);
  }
});

test("project summary queries split active and trashed projects", async () => {
  const active = createProjectSql([
    {
      id: "project-1",
      title: "Active",
      status: "draft",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
      deletedAt: null,
    },
  ]);

  const activeProjects = await listProjectSummariesForUser("user-1", active.sql);

  assert.equal(activeProjects[0]?.deletedAt, null);
  assert.ok(active.statements[0]?.includes("deleted_at IS NULL"));

  const trash = createProjectSql([
    {
      id: "project-2",
      title: "Trashed",
      status: "ready",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-03T00:00:00.000Z",
      deletedAt: "2026-05-04T00:00:00.000Z",
    },
  ]);

  const trashedProjects = await listDeletedProjectSummariesForUser("user-1", trash.sql);

  assert.equal(trashedProjects[0]?.deletedAt, "2026-05-04T00:00:00.000Z");
  assert.ok(trash.statements[0]?.includes("deleted_at IS NOT NULL"));
});

test("project trash lifecycle uses soft delete before permanent delete", async () => {
  const trash = createProjectSql([{ id: "project-1" }]);
  assert.equal(await trashProjectForUser("user-1", "project-1", trash.sql), true);
  assert.ok(trash.statements[0]?.includes("UPDATE projects"));
  assert.ok(trash.statements[0]?.includes("SET deleted_at = ?"));
  assert.ok(trash.statements[0]?.includes("deleted_at IS NULL"));

  const restore = createProjectSql([{ id: "project-1" }]);
  assert.equal(await restoreProjectForUser("user-1", "project-1", restore.sql), true);
  assert.ok(restore.statements[0]?.includes("SET deleted_at = NULL"));
  assert.ok(restore.statements[0]?.includes("deleted_at IS NOT NULL"));

  const remove = createProjectSql([{ id: "project-1" }]);
  assert.equal(await deleteProjectForUser("user-1", "project-1", remove.sql), true);
  assert.ok(remove.statements[0]?.includes("DELETE FROM projects"));
  assert.ok(remove.statements[0]?.includes("deleted_at IS NOT NULL"));
});

test("project generation logs ignore trashed projects", async () => {
  const logs = createProjectSql([]);

  await listEbookGenerationLogsForProject("user-1", "project-1", logs.sql);

  assert.ok(logs.statements[0]?.includes("FROM ebook_generation_logs"));
  assert.ok(logs.statements[0]?.includes("deleted_at IS NULL"));
});
