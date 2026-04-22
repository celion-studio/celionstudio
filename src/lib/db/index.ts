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

export function ensureAppSchema(
  sql?: SqlClient,
  options: EnsureAppSchemaOptions = {},
) {
  if (options.force) {
    schemaReadyPromise = null;
  }

  if (!schemaReadyPromise) {
    const initConfig = sql ? { sql } : resolveSchemaInitConfig();
    schemaReadyPromise = applyAppSchema(initConfig.sql, {
      appRole: initConfig.appRole,
    }).catch((error: unknown) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}
