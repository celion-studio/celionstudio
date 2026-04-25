import { neon } from "@neondatabase/serverless";
import { applyAppSchema } from "@/lib/db/schema";

let sqlInstance: ReturnType<typeof neon> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

type SqlClient = Parameters<typeof applyAppSchema>[0];
type SchemaInitConfig = {
  sql: SqlClient;
  appRole?: string;
};
type DbEnv = {
  [key: string]: string | undefined;
  DATABASE_OWNER_URL?: string;
  DATABASE_URL?: string;
  APP_DATABASE_ROLE?: string;
};

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return databaseUrl;
}

export function getSql() {
  if (!sqlInstance) {
    sqlInstance = neon(requireDatabaseUrl());
  }

  return sqlInstance;
}

function getDatabaseUsername(databaseUrl: string | undefined) {
  if (!databaseUrl) return undefined;

  try {
    return new URL(databaseUrl).username || undefined;
  } catch {
    return undefined;
  }
}

export function resolveSchemaInitConfig(
  appSql: SqlClient = getSql(),
  env: DbEnv = process.env,
): SchemaInitConfig {
  if (!env.DATABASE_OWNER_URL) {
    return { sql: appSql };
  }

  return {
    sql: neon(env.DATABASE_OWNER_URL),
    appRole: env.APP_DATABASE_ROLE ?? getDatabaseUsername(env.DATABASE_URL),
  };
}

type EnsureAppSchemaOptions = {
  force?: boolean;
};

const SCHEMA_INIT_RETRY_DELAYS_MS = [500, 1500] as const;
const TRANSIENT_DB_ERROR_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorCodeFrom(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("code" in value)) return undefined;
  return typeof value.code === "string" ? value.code : undefined;
}

function errorMessageFrom(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return "";
}

function nestedErrorValue(value: unknown, key: "cause" | "sourceError") {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  return value[key as keyof typeof value];
}

export function isTransientDatabaseError(error: unknown): boolean {
  const directCode = errorCodeFrom(error);
  const sourceError = nestedErrorValue(error, "sourceError");
  const sourceCode = errorCodeFrom(sourceError);
  const cause = nestedErrorValue(error, "cause") ?? nestedErrorValue(sourceError, "cause");
  const causeCode = errorCodeFrom(cause);
  if ([directCode, sourceCode, causeCode].some((code) => code && TRANSIENT_DB_ERROR_CODES.has(code))) {
    return true;
  }

  const message = [
    errorMessageFrom(error),
    errorMessageFrom(sourceError),
    errorMessageFrom(cause),
  ].join(" ");
  return /fetch failed|connect timeout|connection timeout|network/i.test(message);
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return isTransientDatabaseError(error);
}

async function applyAppSchemaWithRetry(
  sql: SqlClient,
  options: Parameters<typeof applyAppSchema>[1],
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await applyAppSchema(sql, options);
      return;
    } catch (error) {
      const delayMs = SCHEMA_INIT_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined || !isTransientDatabaseError(error)) {
        throw error;
      }
      await delay(delayMs);
    }
  }
}

export function ensureAppSchema(
  sql?: SqlClient,
  options: EnsureAppSchemaOptions = {},
) {
  if (options.force) {
    schemaReadyPromise = null;
  }

  if (!schemaReadyPromise) {
    const initConfig = sql ? { sql } : resolveSchemaInitConfig();
    schemaReadyPromise = applyAppSchemaWithRetry(initConfig.sql, {
      appRole: initConfig.appRole,
    }).catch((error: unknown) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}
