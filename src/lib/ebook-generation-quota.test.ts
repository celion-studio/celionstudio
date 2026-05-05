import assert from "node:assert/strict";
import test from "node:test";
import {
  checkEbookGenerationQuota,
  resolveDailyGenerationLimit,
} from "./ebook-generation-quota";

test("resolveDailyGenerationLimit uses a safe default for missing or invalid values", () => {
  assert.equal(resolveDailyGenerationLimit({}), 5);
  assert.equal(resolveDailyGenerationLimit({ CELION_DAILY_GENERATION_LIMIT: "0" }), 5);
  assert.equal(resolveDailyGenerationLimit({ CELION_DAILY_GENERATION_LIMIT: "nope" }), 5);
  assert.equal(resolveDailyGenerationLimit({ CELION_DAILY_GENERATION_LIMIT: "12" }), 12);
});

test("checkEbookGenerationQuota allows users below the daily limit", async () => {
  const result = await checkEbookGenerationQuota("user-1", {
    env: { CELION_DAILY_GENERATION_LIMIT: "5" },
    now: new Date("2026-05-05T00:00:00Z"),
    ensureSchema: async () => {},
    sql: async () => [{ count: "4" }],
  });

  assert.deepEqual(result, { ok: true });
});

test("checkEbookGenerationQuota blocks users at the daily limit", async () => {
  const result = await checkEbookGenerationQuota("user-1", {
    env: { CELION_DAILY_GENERATION_LIMIT: "2" },
    now: new Date("2026-05-05T00:00:00Z"),
    ensureSchema: async () => {},
    sql: async () => [{ count: 2 }],
  });

  assert.deepEqual(result, {
    ok: false,
    status: 429,
    message: "Daily generation limit reached. Try again tomorrow.",
  });
});

test("checkEbookGenerationQuota fails closed when quota cannot be verified", async () => {
  const result = await checkEbookGenerationQuota("user-1", {
    ensureSchema: async () => {},
    sql: async () => {
      throw new Error("database unavailable");
    },
  });

  assert.deepEqual(result, {
    ok: false,
    status: 503,
    message: "Could not verify generation quota. Please try again.",
  });
});
