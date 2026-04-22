import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { pathToFileURL } from "node:url";
import { applyAppSchema } from "../src/lib/db/schema";

config({ path: ".env.local" });
config();

type InitDbEnv = {
  [key: string]: string | undefined;
  DATABASE_OWNER_URL?: string;
  DATABASE_URL?: string;
  APP_DATABASE_ROLE?: string;
};

export function resolveInitDbConfig(env: InitDbEnv = process.env) {
  const databaseUrl = env.DATABASE_OWNER_URL ?? env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_OWNER_URL or DATABASE_URL is required to initialize the app schema.",
    );
  }

  const appRole =
    env.APP_DATABASE_ROLE ??
    (env.DATABASE_OWNER_URL && env.DATABASE_URL
      ? new URL(env.DATABASE_URL).username
      : undefined);

  return { databaseUrl, appRole };
}

async function main() {
  const { databaseUrl, appRole } = resolveInitDbConfig();
  const sql = neon(databaseUrl);
  await applyAppSchema(sql, {
    appRole,
  });

  console.log("App schema is ready.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
