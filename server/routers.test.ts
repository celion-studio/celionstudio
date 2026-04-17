import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): {
  ctx: TrpcContext;
  clearedCookies: { name: string; options: Record<string, unknown> }[];
} {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "creator@example.com",
    name: "Test Creator",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    subscriptionStatus: "free",
    polarSubscriptionId: null,
    monthlyDmCount: 0,
    lastDmResetAt: new Date(),
    igAccountId: null,
    igPageAccessToken: null,
    ...overrides,
  } as AuthenticatedUser;

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("protected procedures", () => {
  it("dashboard.stats throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow("Please login");
  });

  it("products.list throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.products.list()).rejects.toThrow("Please login");
  });

  it("automations.list throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.automations.list()).rejects.toThrow("Please login");
  });

  it("dmLogs.list throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dmLogs.list()).rejects.toThrow("Please login");
  });
});

describe("products.create validation", () => {
  it("rejects empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.products.create({ title: "" })
    ).rejects.toThrow();
  });
});

describe("automations.create validation", () => {
  it("rejects empty name", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.automations.create({
        name: "",
        triggerKeywords: ["ebook"],
        dmTemplate: "Hello!",
      })
    ).rejects.toThrow();
  });

  it("rejects empty dmTemplate", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.automations.create({
        name: "Test",
        triggerKeywords: ["ebook"],
        dmTemplate: "",
      })
    ).rejects.toThrow();
  });
});

describe("settings", () => {
  it("settings.get throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.settings.get()).rejects.toThrow("Please login");
  });

  it("settings.updateInstagram rejects empty igAccountId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.settings.updateInstagram({
        igAccountId: "",
        igPageAccessToken: "some-token",
      })
    ).rejects.toThrow();
  });

  it("settings.updateInstagram rejects empty igPageAccessToken", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.settings.updateInstagram({
        igAccountId: "12345",
        igPageAccessToken: "",
      })
    ).rejects.toThrow();
  });

  it("settings.disconnectInstagram throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.settings.disconnectInstagram()).rejects.toThrow("Please login");
  });
});

describe("billing", () => {
  it("createCheckout returns config message when no Polar key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.createCheckout();
    expect(result).toBeDefined();
    expect(result.checkoutUrl).toBeNull();
    expect(result.message).toContain("POLAR_API_KEY");
  });

  it("manageSubscription returns config message when no Polar key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.billing.manageSubscription();
    expect(result).toBeDefined();
    expect(result.portalUrl).toBeNull();
    expect(result.message).toContain("POLAR_API_KEY");
  });
});
