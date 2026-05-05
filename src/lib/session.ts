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

export async function getRouteSession(): Promise<ServerSession | null> {
  return fetchCurrentSession();
}

// Pages that read sessions should remain dynamic because session state depends on cookies.
export async function getPageSession(): Promise<ServerSession | null> {
  return fetchCurrentSession();
}

function normalizeSession(result: AuthSessionResult | null | undefined) {
  return result?.data?.user?.id ? result.data : null;
}

async function fetchCurrentSession(): Promise<ServerSession | null> {
  if (!auth) return null;

  try {
    return normalizeSession((await auth.getSession()) as AuthSessionResult);
  } catch {
    return null;
  }
}
