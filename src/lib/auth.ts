import { createNeonAuth } from "@neondatabase/auth/next/server";

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

function createConfiguredAuth() {
  if (!authBaseUrl || !cookieSecret || cookieSecret.length < 32) return null;

  return createNeonAuth({
    baseUrl: authBaseUrl,
    cookies: {
      secret: cookieSecret,
      sessionDataTtl: 300,
    },
  });
}

export const auth = createConfiguredAuth();
export const isAuthConfigured = auth !== null;
