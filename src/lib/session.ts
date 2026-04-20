import { auth } from "@/lib/auth";

export async function getServerSession() {
  if (!auth) return null;
  const result = await auth.getSession();
  return result.data ?? null;
}
