import assert from "node:assert/strict";
import test from "node:test";
import { ensureAppSchema, resolveSchemaInitConfig } from "./index";

test("ensureAppSchema retries after failure and applies the app schema once per runtime", async () => {
  const failingSql = async () => {
    throw new Error("temporary schema init failure");
  };

  await assert.rejects(
    () => ensureAppSchema(failingSql, { force: true }),
    /temporary schema init failure/,
  );

  const appliedStatements: string[] = [];
  const sql = async (strings: TemplateStringsArray) => {
    appliedStatements.push(strings.join("?"));
    return [];
  };

  await Promise.all([
    ensureAppSchema(sql, { force: true }),
    ensureAppSchema(sql),
  ]);

  assert.ok(appliedStatements[0]?.includes("CREATE TABLE IF NOT EXISTS projects"));
  assert.ok(
    appliedStatements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS project_profiles"),
    ),
  );
  assert.ok(
    appliedStatements.some((statement) =>
      statement.includes("CREATE INDEX IF NOT EXISTS projects_user_id_updated_at_idx"),
    ),
  );
});

test("resolveSchemaInitConfig uses the owner URL and infers the app role when available", () => {
  const appSql = async () => [];
  const config = resolveSchemaInitConfig(appSql, {
    DATABASE_OWNER_URL: "postgres://owner:secret@example.test/neondb",
    DATABASE_URL: "postgres://runtime_user:secret@example.test/neondb",
  });

  assert.notEqual(config.sql, appSql);
  assert.equal(config.appRole, "runtime_user");
});


