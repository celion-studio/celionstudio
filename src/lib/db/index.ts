import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

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
