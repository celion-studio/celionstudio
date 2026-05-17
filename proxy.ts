import { NextResponse, type NextRequest } from "next/server";
import { auth, isAuthConfigured } from "@/lib/auth";
import { getSafeAuthNext, NEON_AUTH_VERIFIER_PARAM } from "@/lib/auth-redirect";

const AUTH_LOGIN_URL = "/auth?mode=sign-in";
const authMiddleware = auth?.middleware({ loginUrl: AUTH_LOGIN_URL });

function hasVerifier(request: NextRequest) {
  return request.nextUrl.searchParams.has(NEON_AUTH_VERIFIER_PARAM);
}

function buildAuthRedirectUrl(request: NextRequest) {
  const next = getSafeAuthNext(
    request.nextUrl.pathname + request.nextUrl.search,
    "/dashboard",
  );
  return new URL(
    `/auth?mode=sign-in&next=${encodeURIComponent(next)}`,
    request.url,
  );
}

function isAuthRedirect(response: NextResponse, request: NextRequest) {
  const location = response.headers.get("location");
  if (!location) return false;
  const target = new URL(location, request.url);
  return target.pathname === "/auth";
}

export async function proxy(request: NextRequest) {
  // OAuth callback — let the client SDK handle the neon_auth_session_verifier.
  // The session cookie hasn't been set yet at this point.
  if (hasVerifier(request)) return;

  if (!isAuthConfigured || !authMiddleware) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = await authMiddleware(request);

  if (isAuthRedirect(response, request)) {
    response.headers.set("location", buildAuthRedirectUrl(request).toString());
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*"],
};
