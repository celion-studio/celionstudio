import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { applyAppSchema } from "../src/lib/db/schema";

config({ path: ".env.local" });
config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize the app schema.");
  }

  const sql = neon(databaseUrl);
  await applyAppSchema(sql);

  console.log("App schema is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
