import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureAppSchema,
  isDatabaseUnavailableError,
  isTransientDatabaseError,
  resolveSchemaInitConfig,
} from "./index";

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

test("ensureAppSchema retries transient Neon fetch timeouts", async () => {
  let calls = 0;
  const appliedStatements: string[] = [];
  const sql = async (strings: TemplateStringsArray) => {
    calls += 1;
    if (calls <= 2) {
      throw Object.assign(new Error("Error connecting to database: TypeError: fetch failed"), {
        sourceError: {
          cause: {
            code: "UND_ERR_CONNECT_TIMEOUT",
          },
        },
      });
    }
    appliedStatements.push(strings.join("?"));
    return [];
  };

  await ensureAppSchema(sql, { force: true });

  assert.equal(calls, 2 + appliedStatements.length);
  assert.ok(appliedStatements[0]?.includes("CREATE TABLE IF NOT EXISTS projects"));
});

test("database unavailable detection recognizes Neon fetch timeouts", () => {
  const error = Object.assign(new Error("Error connecting to database: TypeError: fetch failed"), {
    sourceError: {
      cause: {
        code: "UND_ERR_CONNECT_TIMEOUT",
      },
    },
  });

  assert.equal(isTransientDatabaseError(error), true);
  assert.equal(isDatabaseUnavailableError(error), true);
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


