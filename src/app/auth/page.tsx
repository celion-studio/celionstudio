import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/AuthPage";
import { getSafeAuthNext } from "@/lib/auth-redirect";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Celion",
  description: "Sign in to your Celion workspace and continue shaping editable ebooks.",
};

type AuthRouteProps = {
  searchParams?: Promise<{
    mode?: string;
    next?: string;
  }>;
};

export default async function AuthRoute({ searchParams }: AuthRouteProps) {
  const params = await searchParams;
  const nextPath = getSafeAuthNext(params?.next);
  const session = await getPageSession();
  if (session?.user) redirect(nextPath as Route);

  const initialMode = params?.mode === "sign-up" ? "sign-up" : "sign-in";

  return <AuthPage key={`${initialMode}:${nextPath}`} initialMode={initialMode} initialNext={nextPath} />;
}
