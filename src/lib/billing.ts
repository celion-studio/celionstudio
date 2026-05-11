import { Polar } from "@polar-sh/sdk";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload";
import { getSql } from "@/lib/db";

export const BILLING_PLAN_IDS = ["starter", "studio", "team"] as const;
export const PAID_BILLING_PLAN_IDS = ["studio", "team"] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];
export type PaidBillingPlanId = (typeof PAID_BILLING_PLAN_IDS)[number];

type BillingSqlClient = ReturnType<typeof getSql>;

type BillingEnv = {
  [key: string]: string | undefined;
  APP_URL?: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_SERVER?: string;
  POLAR_STUDIO_PRODUCT_ID?: string;
  POLAR_TEAM_PRODUCT_ID?: string;
  POLAR_WEBHOOK_SECRET?: string;
};

type BillingCustomerRow = {
  userId: string;
  polarCustomerId: string | null;
  email: string | null;
  name: string | null;
  activePlan: BillingPlanId | string;
  activeProductId: string | null;
  activeSubscriptionId: string | null;
  customerState: unknown;
};

export type BillingState = {
  activePlan: BillingPlanId;
  status: "free" | "active" | "not_configured";
  activeProductId: string | null;
  activeSubscriptionId: string | null;
  portalAvailable: boolean;
  configured: boolean;
};

export type CheckoutRequestInput = {
  plan: PaidBillingPlanId;
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  origin: string;
};

export type CheckoutResult = {
  url: string;
};

function appUrl(env: BillingEnv = process.env) {
  return (env.APP_URL || "").replace(/\/$/, "");
}

export function getPolarServer(env: BillingEnv = process.env) {
  return env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function billingConfigStatus(env: BillingEnv = process.env) {
  const configured = Boolean(
    env.POLAR_ACCESS_TOKEN &&
      env.POLAR_STUDIO_PRODUCT_ID &&
      env.POLAR_TEAM_PRODUCT_ID &&
      env.POLAR_WEBHOOK_SECRET,
  );

  return { configured };
}

export function productIdForPlan(plan: PaidBillingPlanId, env: BillingEnv = process.env) {
  return plan === "studio" ? env.POLAR_STUDIO_PRODUCT_ID : env.POLAR_TEAM_PRODUCT_ID;
}

export function planForProductId(productId: string | null | undefined, env: BillingEnv = process.env): BillingPlanId {
  if (productId && productId === env.POLAR_STUDIO_PRODUCT_ID) return "studio";
  if (productId && productId === env.POLAR_TEAM_PRODUCT_ID) return "team";
  return "starter";
}

function isPaidPlan(plan: string): plan is PaidBillingPlanId {
  return plan === "studio" || plan === "team";
}

function normalizeCustomerState(state: CustomerState) {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
}

function firstKnownActiveSubscription(state: CustomerState, env: BillingEnv = process.env) {
  const subscriptions = [...state.activeSubscriptions].sort((a, b) => {
    const aRank = planForProductId(a.productId, env) === "team" ? 0 : 1;
    const bRank = planForProductId(b.productId, env) === "team" ? 0 : 1;
    return aRank - bRank;
  });

  return subscriptions.find((subscription) => isPaidPlan(planForProductId(subscription.productId, env))) ?? null;
}

export function deriveBillingStateFromCustomerState(
  state: CustomerState | null | undefined,
  env: BillingEnv = process.env,
): Pick<BillingState, "activePlan" | "activeProductId" | "activeSubscriptionId" | "status"> {
  if (!state) {
    return {
      activePlan: "starter",
      activeProductId: null,
      activeSubscriptionId: null,
      status: "free",
    };
  }

  const subscription = firstKnownActiveSubscription(state, env);
  const activePlan = planForProductId(subscription?.productId, env);

  return {
    activePlan,
    activeProductId: subscription?.productId ?? null,
    activeSubscriptionId: subscription?.id ?? null,
    status: activePlan === "starter" ? "free" : "active",
  };
}

function rowToBillingState(row: BillingCustomerRow | undefined, configured: boolean): BillingState {
  if (!configured) {
    return {
      activePlan: "starter",
      status: "not_configured",
      activeProductId: null,
      activeSubscriptionId: null,
      portalAvailable: false,
      configured: false,
    };
  }

  const activePlan = BILLING_PLAN_IDS.includes(row?.activePlan as BillingPlanId)
    ? (row?.activePlan as BillingPlanId)
    : "starter";

  return {
    activePlan,
    status: activePlan === "starter" ? "free" : "active",
    activeProductId: row?.activeProductId ?? null,
    activeSubscriptionId: row?.activeSubscriptionId ?? null,
    portalAvailable: Boolean(row?.polarCustomerId),
    configured: true,
  };
}

function errorMessageFrom(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return "";
}

function errorCodeFrom(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("code" in value)) return undefined;
  return typeof value.code === "string" ? value.code : undefined;
}

function nestedErrorValue(value: unknown, key: "cause" | "sourceError") {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  return value[key as keyof typeof value];
}

function isMissingBillingTablesError(error: unknown) {
  const sourceError = nestedErrorValue(error, "sourceError");
  const cause = nestedErrorValue(error, "cause") ?? nestedErrorValue(sourceError, "cause");
  const code = errorCodeFrom(error) ?? errorCodeFrom(sourceError) ?? errorCodeFrom(cause);
  const message = [errorMessageFrom(error), errorMessageFrom(sourceError), errorMessageFrom(cause)].join(" ");

  return code === "42P01" || /billing_customers|billing_events/i.test(message);
}

export async function getBillingStateForUser(
  userId: string,
  sql: BillingSqlClient = getSql(),
  env: BillingEnv = process.env,
): Promise<BillingState> {
  const { configured } = billingConfigStatus(env);
  if (!configured) return rowToBillingState(undefined, false);

  try {
    const rows = (await sql`
      SELECT user_id AS "userId",
        polar_customer_id AS "polarCustomerId",
        email,
        name,
        active_plan AS "activePlan",
        active_product_id AS "activeProductId",
        active_subscription_id AS "activeSubscriptionId",
        customer_state AS "customerState"
      FROM billing_customers
      WHERE user_id = ${userId}
      LIMIT 1
    `) as BillingCustomerRow[];

    return rowToBillingState(rows[0], configured);
  } catch (error) {
    if (isMissingBillingTablesError(error)) return rowToBillingState(undefined, configured);
    throw error;
  }
}

export async function getPolarCustomerIdForUser(
  userId: string,
  sql: BillingSqlClient = getSql(),
): Promise<string | null> {
  try {
    const rows = (await sql`
      SELECT polar_customer_id AS "polarCustomerId"
      FROM billing_customers
      WHERE user_id = ${userId}
      LIMIT 1
    `) as Pick<BillingCustomerRow, "polarCustomerId">[];

    return rows[0]?.polarCustomerId ?? null;
  } catch (error) {
    if (isMissingBillingTablesError(error)) return null;
    throw error;
  }
}

export async function createBillingCheckout(
  input: CheckoutRequestInput,
  env: BillingEnv = process.env,
): Promise<CheckoutResult> {
  const productId = productIdForPlan(input.plan, env);
  const baseUrl = appUrl(env) || input.origin.replace(/\/$/, "");
  const accessToken = env.POLAR_ACCESS_TOKEN;

  if (!accessToken || !productId || !baseUrl) {
    throw new Error("Billing is not configured yet.");
  }

  const polar = new Polar({
    accessToken,
    server: getPolarServer(env),
  });

  const checkout = await polar.checkouts.create({
    products: [productId],
    externalCustomerId: input.user.id,
    customerEmail: input.user.email ?? undefined,
    customerName: input.user.name ?? undefined,
    successUrl: `${baseUrl}/dashboard?view=billing&checkout=success`,
    returnUrl: `${baseUrl}/dashboard?view=billing`,
    metadata: {
      celionUserId: input.user.id,
      plan: input.plan,
    },
  });

  return { url: checkout.url };
}

function eventKeyForPayload(payload: { type: string; timestamp?: Date | string; data?: { id?: string } }) {
  const timestamp = payload.timestamp instanceof Date ? payload.timestamp.toISOString() : (payload.timestamp ?? "");
  return [payload.type, payload.data?.id ?? "unknown", timestamp].join(":");
}

export async function recordBillingEvent(
  payload: { type: string; timestamp?: Date | string; data?: { id?: string } },
  sql: BillingSqlClient = getSql(),
) {
  const eventId = eventKeyForPayload(payload);
  const payloadJson = JSON.stringify(payload);
  const rows = (await sql`
    INSERT INTO billing_events (event_id, event_type, payload)
    VALUES (${eventId}, ${payload.type}, ${payloadJson}::jsonb)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id AS "eventId"
  `) as { eventId: string }[];

  return rows.length > 0;
}

export async function syncCustomerStateFromWebhook(
  payload: WebhookCustomerStateChangedPayload,
  sql: BillingSqlClient = getSql(),
  env: BillingEnv = process.env,
) {
  const state = payload.data;
  const userId = state.externalId;

  if (!userId) {
    return { synced: false, reason: "missing_external_customer_id" as const };
  }

  const derived = deriveBillingStateFromCustomerState(state, env);
  const customerStateJson = JSON.stringify(normalizeCustomerState(state));

  await sql`
    INSERT INTO billing_customers (
      user_id,
      polar_customer_id,
      email,
      name,
      customer_state,
      active_plan,
      active_product_id,
      active_subscription_id,
      updated_at
    )
    VALUES (
      ${userId},
      ${state.id},
      ${state.email},
      ${state.name ?? null},
      ${customerStateJson}::jsonb,
      ${derived.activePlan},
      ${derived.activeProductId},
      ${derived.activeSubscriptionId},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      polar_customer_id = EXCLUDED.polar_customer_id,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      customer_state = EXCLUDED.customer_state,
      active_plan = EXCLUDED.active_plan,
      active_product_id = EXCLUDED.active_product_id,
      active_subscription_id = EXCLUDED.active_subscription_id,
      updated_at = now()
  `;

  return { synced: true, activePlan: derived.activePlan };
}

export async function handlePolarWebhookPayload(
  payload: { type: string; timestamp?: Date | string; data?: { id?: string } },
  sql: BillingSqlClient = getSql(),
  env: BillingEnv = process.env,
) {
  const inserted = await recordBillingEvent(payload, sql);
  if (!inserted) return { duplicate: true, synced: false };

  if (payload.type !== "customer.state_changed") {
    return { duplicate: false, synced: false };
  }

  const result = await syncCustomerStateFromWebhook(payload as WebhookCustomerStateChangedPayload, sql, env);
  return { duplicate: false, synced: result.synced };
}
