import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const guideStatusEnum = pgEnum("guide_status", [
  "draft",
  "processing_sources",
  "generating",
  "ready",
  "revising",
  "exported",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "pasted_text",
  "pdf",
  "md",
  "txt",
  "docx",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const guides = pgTable("guides", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: guideStatusEnum("status").notNull().default("draft"),
  currentHtmlVersionId: uuid("current_html_version_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sourceItems = pgTable("source_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),
  sourceType: sourceTypeEnum("source_type").notNull(),
  originalFilename: text("original_filename"),
  rawText: text("raw_text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const guideProfiles = pgTable("guide_profiles", {
  guideId: uuid("guide_id")
    .primaryKey()
    .references(() => guides.id, { onDelete: "cascade" }),
  targetAudience: text("target_audience").notNull(),
  goal: text("goal").notNull(),
  depth: text("depth").notNull(),
  tone: text("tone").notNull(),
  structureStyle: text("structure_style").notNull(),
  readerLevel: text("reader_level").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const htmlVersions = pgTable("html_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),
  html: text("html").notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  createdByRunId: uuid("created_by_run_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),
  runType: text("run_type").notNull(),
  status: text("status").notNull(),
  prompt: text("prompt").notNull(),
  targetSection: text("target_section"),
  inputMeta: jsonb("input_meta"),
  outputMeta: jsonb("output_meta"),
  model: text("model"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exportJobs = pgTable("export_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id")
    .notNull()
    .references(() => guides.id, { onDelete: "cascade" }),
  htmlVersionId: uuid("html_version_id")
    .notNull()
    .references(() => htmlVersions.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});
