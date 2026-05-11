import { NextResponse, type NextRequest } from "next/server";
import { buildAuthHref } from "@/lib/auth-redirect";

const NEON_SESSION_COOKIE = "__Secure-neon-auth.session_token";
const NEON_VERIFIER_PARAM = "neon_auth_session_verifier";

function isProtectedPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname.startsWith("/editor/");
}

function hasSessionCookie(request: NextRequest) {
  return request.cookies.has(NEON_SESSION_COOKIE);
}

function buildNextPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.searchParams.has(NEON_VERIFIER_PARAM) || hasSessionCookie(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(buildAuthHref("sign-in", buildNextPath(request)), request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*"],
};
