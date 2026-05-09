export type AuthMode = "sign-in" | "sign-up";

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

export function buildAuthHref(mode: AuthMode, next?: string) {
  const params = new URLSearchParams({ mode });
  const safeNext = getSafeAuthNext(next, "");

  if (safeNext) {
    params.set("next", safeNext);
  }

  return `/auth?${params.toString()}`;
}

export function buildDashboardCallbackUrl(next?: string) {
  const safeNext = getSafeAuthNext(next, "");

  if (!safeNext || safeNext === "/dashboard") {
    return "/dashboard";
  }

  return `/dashboard?next=${encodeURIComponent(safeNext)}`;
}
