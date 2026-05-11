import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveBillingStateFromCustomerState,
  getBillingStateForUser,
  getPolarCustomerIdForUser,
  handlePolarWebhookPayload,
  planForProductId,
  syncCustomerStateFromWebhook,
} from "./billing";

function createRecordingSql(results: unknown[][] = []) {
  const calls: { statement: string; params: unknown[] }[] = [];
  const normalizeSql = (statement: string) => statement.replace(/\s+/g, " ").trim();
  const sql = async (strings: TemplateStringsArray, ...params: unknown[]) => {
    calls.push({ statement: normalizeSql(strings.join("?")), params });
    return results.shift() ?? [];
  };

  return { sql, calls };
}

const env = {
  POLAR_ACCESS_TOKEN: "polar_token",
  POLAR_WEBHOOK_SECRET: "polar_webhook_secret",
  POLAR_STUDIO_PRODUCT_ID: "product_studio",
  POLAR_TEAM_PRODUCT_ID: "product_team",
};

function customerState(productId: string | null) {
  return {
    id: "customer_123",
    externalId: "user_123",
    email: "lee@example.com",
    name: "Lee",
    activeSubscriptions: productId
      ? [
          {
            id: "subscription_123",
            productId,
            status: "active",
          },
        ]
      : [],
  } as never;
}

test("planForProductId maps only configured Studio and Team products", () => {
  assert.equal(planForProductId("product_studio", env), "studio");
  assert.equal(planForProductId("product_team", env), "team");
  assert.equal(planForProductId("product_unknown", env), "starter");
  assert.equal(planForProductId(null, env), "starter");
});

test("deriveBillingStateFromCustomerState falls back to starter for unknown products", () => {
  const state = deriveBillingStateFromCustomerState(customerState("product_unknown"), env);

  assert.equal(state.activePlan, "starter");
  assert.equal(state.status, "free");
  assert.equal(state.activeProductId, null);
});

test("syncCustomerStateFromWebhook stores active plan and raw customer state", async () => {
  const { sql, calls } = createRecordingSql();

  const result = await syncCustomerStateFromWebhook(
    {
      type: "customer.state_changed",
      timestamp: new Date("2026-05-11T00:00:00.000Z"),
      data: customerState("product_team"),
    },
    sql as never,
    env,
  );

  assert.equal(result.synced, true);
  assert.equal(result.activePlan, "team");
  assert.ok(calls.some((call) => call.statement.includes("INSERT INTO billing_customers")));
  assert.ok(calls.some((call) => call.params.includes("team")));
  assert.ok(calls.some((call) => call.params.includes("product_team")));
});

test("handlePolarWebhookPayload ignores duplicate events safely", async () => {
  const { sql, calls } = createRecordingSql([[]]);

  const result = await handlePolarWebhookPayload(
    {
      type: "customer.state_changed",
      timestamp: new Date("2026-05-11T00:00:00.000Z"),
      data: customerState("product_team"),
    },
    sql as never,
    env,
  );

  assert.deepEqual(result, { duplicate: true, synced: false });
  assert.equal(calls.length, 1);
  assert.ok(calls[0]?.statement.includes("INSERT INTO billing_events"));
});

test("getBillingStateForUser returns starter without querying when Polar is not configured", async () => {
  const { sql, calls } = createRecordingSql();

  const state = await getBillingStateForUser("user_123", sql as never, {});

  assert.equal(state.activePlan, "starter");
  assert.equal(state.status, "not_configured");
  assert.equal(state.configured, false);
  assert.equal(calls.length, 0);
});

test("getBillingStateForUser falls back to starter when billing tables are not applied yet", async () => {
  const missingRelationError = Object.assign(new Error('relation "billing_customers" does not exist'), {
    code: "42P01",
  });
  const sql = async () => {
    throw missingRelationError;
  };

  const state = await getBillingStateForUser("user_123", sql as never, env);

  assert.equal(state.activePlan, "starter");
  assert.equal(state.status, "free");
  assert.equal(state.configured, true);
});

test("getPolarCustomerIdForUser returns null when billing tables are not applied yet", async () => {
  const missingRelationError = Object.assign(new Error('relation "billing_customers" does not exist'), {
    code: "42P01",
  });
  const sql = async () => {
    throw missingRelationError;
  };

  await assert.doesNotReject(async () => {
    assert.equal(await getPolarCustomerIdForUser("user_123", sql as never), null);
  });
});
