import assert from "node:assert/strict";
import test from "node:test";
import { resolveInitDbConfig } from "./init-db";

test("resolveInitDbConfig uses the owner URL and infers the app role from DATABASE_URL", () => {
  const config = resolveInitDbConfig({
    DATABASE_OWNER_URL: "postgres://owner:secret@example.test/neondb",
    DATABASE_URL: "postgres://runtime_user:secret@example.test/neondb",
  });

  assert.equal(
    config.databaseUrl,
    "postgres://owner:secret@example.test/neondb",
  );
  assert.equal(config.appRole, "runtime_user");
});

test("resolveInitDbConfig uses an explicit APP_DATABASE_ROLE when provided", () => {
  const config = resolveInitDbConfig({
    DATABASE_OWNER_URL: "postgres://owner:secret@example.test/neondb",
    DATABASE_URL: "postgres://runtime_user:secret@example.test/neondb",
    APP_DATABASE_ROLE: "celion_app",
  });

  assert.equal(config.appRole, "celion_app");
});

