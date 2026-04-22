import { headers } from "next/headers";
import { auth } from "@/lib/auth";

type ServerSession = {
  session: unknown;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

type AuthSessionResult = {
  data?: ServerSession | null;
};

function normalizeSession(result: AuthSessionResult | null | undefined) {
  return result?.data?.user?.id ? result.data : null;
}

export async function getRouteSession(): Promise<ServerSession | null> {
  if (!auth) return null;

  return normalizeSession((await auth.getSession()) as AuthSessionResult);
}

// Server Components cannot safely let Neon Auth refresh cookies during render.
export async function getPageSession(): Promise<ServerSession | null> {
  if (!auth) return null;

  const headerStore = await headers();
  const cookie = headerStore.get("cookie");
  if (!cookie) return null;

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return null;

  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const response = await fetch(`${protocol}://${host}/api/auth/get-session`, {
    headers: {
      cookie,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json().catch(() => null)) as Partial<ServerSession> | null;

  if (!result?.session || !result.user?.id) {
    return null;
  }

  return result as ServerSession;
}
