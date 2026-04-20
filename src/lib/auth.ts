import { createNeonAuth } from "@neondatabase/auth/next/server";

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const auth =
  authBaseUrl && cookieSecret && cookieSecret.length >= 32
    ? createNeonAuth({
        baseUrl: authBaseUrl,
        cookies: {
          secret: cookieSecret,
          sessionDataTtl: 300,
        },
      })
    : null;
