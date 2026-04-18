import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  "dev-only-better-auth-secret-change-me-123456";
const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const googleClientId =
  process.env.GOOGLE_CLIENT_ID ?? "google-client-id-placeholder";
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret-placeholder";

export const auth = betterAuth({
  secret: authSecret,
  baseURL: authBaseUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      prompt: "select_account",
    },
  },
  plugins: [nextCookies()],
});
