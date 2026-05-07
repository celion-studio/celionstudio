import assert from "node:assert/strict";
import test from "node:test";
import { applyAppSchema } from "./schema";

function createRecordingSql() {
  const statements: string[] = [];
  const normalizeSql = (statement: string) => statement.replace(/\s+/g, " ").trim();
  const sql = Object.assign(
    async (strings: TemplateStringsArray) => {
      statements.push(normalizeSql(strings.join("?")));
      return [];
    },
    {
      query: async (statement: string) => {
        statements.push(normalizeSql(statement));
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
      statement.includes("CREATE TABLE IF NOT EXISTS ebook_generation_logs") &&
      statement.includes("plan_model text") &&
      statement.includes("plan jsonb") &&
      statement.includes("validation jsonb"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS plan_model"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("SET plan_model = blueprint_model") &&
      statement.includes("DROP COLUMN blueprint_model") &&
      statement.includes("SET plan = blueprint") &&
      statement.includes("DROP COLUMN blueprint"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS goal"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS outline"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS page_format"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS purpose"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("SET purpose = core_message") &&
      statement.includes("ALTER TABLE project_profiles DROP COLUMN core_message"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS plan"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS document"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS blocks"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS page_width_mm"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS page_height_mm"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS ebook_html_url"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS ebook_html_pathname"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS ebook_html_size"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("ADD COLUMN IF NOT EXISTS ebook_document jsonb"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS source_items_project_id_created_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS source_metadata"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS ebook_generation_logs_user_id_created_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("CREATE INDEX CONCURRENTLY IF NOT EXISTS ebook_generation_logs_project_id_created_at_idx"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS current_html_version_id"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP CONSTRAINT IF EXISTS projects_project_type_check"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP COLUMN IF EXISTS project_type"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP TABLE IF EXISTS app_migrations"),
    ),
  );
  assert.ok(
    statements.some((statement) =>
      statement.includes("DROP TABLE IF EXISTS html_versions"),
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
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects, project_profiles, source_items, ebook_generation_logs TO "app""user"',
    ),
  );
  assert.ok(
    statements.includes(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "app""user"',
    ),
  );
});
