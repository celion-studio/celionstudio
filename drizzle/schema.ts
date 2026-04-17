import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),

  // SellMate: Subscription
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["free", "pro"]).default("free").notNull(),
  polarSubscriptionId: varchar("polarSubscriptionId", { length: 128 }),

  // SellMate: DM Usage
  monthlyDmCount: int("monthlyDmCount").default(0).notNull(),
  lastDmResetAt: timestamp("lastDmResetAt").defaultNow().notNull(),

  // SellMate: Instagram Integration
  igAccountId: varchar("igAccountId", { length: 128 }),
  igPageAccessToken: text("igPageAccessToken"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Digital products (ebooks) created by creators.
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  contentMarkdown: text("contentMarkdown"),
  fileUrl: text("fileUrl"),
  externalCheckoutUrl: text("externalCheckoutUrl"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * DM automation rules linking triggers to actions.
 */
export const automations = mysqlTable("automations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("productId").references(() => products.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  igMediaId: varchar("igMediaId", { length: 128 }),
  triggerKeywords: json("triggerKeywords").notNull(), // string[]
  dmTemplate: text("dmTemplate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = typeof automations.$inferInsert;

/**
 * DM send logs for analytics and rate limiting.
 */
export const dmLogs = mysqlTable("dm_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  automationId: int("automationId").references(() => automations.id, { onDelete: "set null" }),
  igCommentId: varchar("igCommentId", { length: 128 }).notNull(),
  igSenderId: varchar("igSenderId", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["success", "failed", "rate_limited"]).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DmLog = typeof dmLogs.$inferSelect;
export type InsertDmLog = typeof dmLogs.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  automations: many(automations),
  dmLogs: many(dmLogs),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  automations: many(automations),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  user: one(users, { fields: [automations.userId], references: [users.id] }),
  product: one(products, { fields: [automations.productId], references: [products.id] }),
  dmLogs: many(dmLogs),
}));

export const dmLogsRelations = relations(dmLogs, ({ one }) => ({
  user: one(users, { fields: [dmLogs.userId], references: [users.id] }),
  automation: one(automations, { fields: [dmLogs.automationId], references: [automations.id] }),
}));
