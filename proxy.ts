import { NextResponse, type NextRequest } from "next/server";
import { auth, isAuthConfigured } from "@/lib/auth";
import { NEON_AUTH_VERIFIER_PARAM } from "@/lib/auth-redirect";

const authMiddleware = auth?.middleware({ loginUrl: "/auth" });

function buildNextPath(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams);
  params.delete(NEON_AUTH_VERIFIER_PARAM);

  const query = params.toString();
  return `${request.nextUrl.pathname}${query ? `?${query}` : ""}`;
}

function redirectHome(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url));
}

function normalizeLoginRedirect(request: NextRequest, response: NextResponse) {
  const location = response.headers.get("location");
  if (!location) return response;

  const locationUrl = new URL(location, request.url);
  if (locationUrl.pathname !== "/auth") return response;

  response.headers.set("location", "/");
  return response;
}

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured || !authMiddleware) return redirectHome(request);

  return normalizeLoginRedirect(request, await authMiddleware(request));
}

export const config = {
  matcher: ["/dashboard/:path*", "/editor/:path*"],
};
