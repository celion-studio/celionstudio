import { eq, and, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, automations, dmLogs } from "../drizzle/schema";
import type { Product, InsertProduct, Automation, InsertAutomation, DmLog, InsertDmLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── User helpers ──

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Product helpers ──

export async function getProductsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.updatedAt));
}

export async function getProductById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.userId, userId))).limit(1);
  return result[0];
}

export async function createProduct(data: Omit<InsertProduct, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  return { id: result[0].insertId };
}

export async function updateProduct(id: number, userId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(and(eq(products.id, id), eq(products.userId, userId)));
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(and(eq(products.id, id), eq(products.userId, userId)));
}

export async function countProductsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(products).where(eq(products.userId, userId));
  return result[0]?.count ?? 0;
}

// ── Automation helpers ──

export async function getAutomationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automations).where(eq(automations.userId, userId)).orderBy(desc(automations.updatedAt));
}

export async function getAutomationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(automations).where(and(eq(automations.id, id), eq(automations.userId, userId))).limit(1);
  return result[0];
}

export async function getActiveAutomationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automations).where(and(eq(automations.userId, userId), eq(automations.isActive, true)));
}

export async function createAutomation(data: Omit<InsertAutomation, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(automations).values(data);
  return { id: result[0].insertId };
}

export async function updateAutomation(id: number, userId: number, data: Partial<InsertAutomation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(automations).set(data).where(and(eq(automations.id, id), eq(automations.userId, userId)));
}

export async function deleteAutomation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(automations).where(and(eq(automations.id, id), eq(automations.userId, userId)));
}

export async function countActiveAutomationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(automations).where(and(eq(automations.userId, userId), eq(automations.isActive, true)));
  return result[0]?.count ?? 0;
}

// ── DM Log helpers ──

export async function getDmLogsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: dmLogs.id,
      userId: dmLogs.userId,
      automationId: dmLogs.automationId,
      igCommentId: dmLogs.igCommentId,
      igSenderId: dmLogs.igSenderId,
      status: dmLogs.status,
      errorMessage: dmLogs.errorMessage,
      createdAt: dmLogs.createdAt,
      automationName: automations.name,
    })
    .from(dmLogs)
    .leftJoin(automations, eq(dmLogs.automationId, automations.id))
    .where(eq(dmLogs.userId, userId))
    .orderBy(desc(dmLogs.createdAt))
    .limit(limit);
  return rows;
}

export async function createDmLog(data: Omit<InsertDmLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(dmLogs).values(data);
}

export async function getDmStatsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, success: 0, failed: 0, rateLimited: 0 };

  const result = await db
    .select({
      status: dmLogs.status,
      count: count(),
    })
    .from(dmLogs)
    .where(eq(dmLogs.userId, userId))
    .groupBy(dmLogs.status);

  const stats = { total: 0, success: 0, failed: 0, rateLimited: 0 };
  for (const row of result) {
    const c = row.count;
    stats.total += c;
    if (row.status === "success") stats.success = c;
    else if (row.status === "failed") stats.failed = c;
    else if (row.status === "rate_limited") stats.rateLimited = c;
  }
  return stats;
}

// ── User subscription helpers ──

export async function updateUserSubscription(userId: number, data: { subscriptionStatus: "free" | "pro"; polarSubscriptionId?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getUserMonthlyDmCount(userId: number) {
  const db = await getDb();
  if (!db) return { monthlyDmCount: 0, lastDmResetAt: new Date() };
  const result = await db.select({ monthlyDmCount: users.monthlyDmCount, lastDmResetAt: users.lastDmResetAt }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? { monthlyDmCount: 0, lastDmResetAt: new Date() };
}

export async function incrementMonthlyDmCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ monthlyDmCount: sql`${users.monthlyDmCount} + 1` }).where(eq(users.id, userId));
}

export async function resetMonthlyDmCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ monthlyDmCount: 0, lastDmResetAt: new Date() }).where(eq(users.id, userId));
}
