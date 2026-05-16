export const NEON_AUTH_VERIFIER_PARAM = "neon_auth_session_verifier";

export function getSafeAuthNext(value: string | null | undefined, fallback = "/dashboard") {
  const next = value?.trim();

  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    next === "/auth" ||
    next.startsWith("/auth?") ||
    next.startsWith("/auth/")
  ) {
    return fallback;
  }

  return next;
}
