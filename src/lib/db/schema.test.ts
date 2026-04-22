import assert from "node:assert/strict";
import test from "node:test";
import { applyAppSchema } from "./schema";

function createRecordingSql() {
  const statements: string[] = [];
  const sql = Object.assign(
    async (strings: TemplateStringsArray) => {
      statements.push(strings.join("?"));
      return [];
    },
    {
      query: async (statement: string) => {
        statements.push(statement);
        return [];
      },
    },
  );

  return { sql, statements };
}

test("applyAppSchema creates project-era tables and indexes", async () => {
  const { sql, statements } = createRecordingSql();

  await applyAppSchema(sql);

  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS projects"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS project_profiles"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS page_format"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS page_width_mm"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS page_height_mm"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS source_items_project_id_created_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS html_versions_project_id_version_number_idx"),
    ),
  );
});

test("applyAppSchema grants app table privileges when an app role is provided", async () => {
  const { sql, statements } = createRecordingSql();

  await applyAppSchema(sql, { appRole: `app"user` });

  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS projects"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS project_profiles"),
    ),
  );
  assert.ok(
    statements.includes('GRANT USAGE ON SCHEMA public TO "app""user"'),
  );
  assert.ok(
    statements.includes(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items, html_versions TO "app""user"',
    ),
  );
  assert.ok(
    statements.includes(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "app""user"',
    ),
  );
});
