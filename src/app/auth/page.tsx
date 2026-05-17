import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { getSafeAuthNext } from "@/lib/auth-redirect";
import { getPageSession } from "@/lib/session";
import { AuthForm } from "./auth-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Celion",
  description: "Sign in or create an account on Celion.",
};

type AuthPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = (await searchParams) ?? {};
  const mode =
    typeof params.mode === "string" && ["sign-in", "sign-up"].includes(params.mode)
      ? (params.mode as "sign-in" | "sign-up")
      : "sign-in";
  const next = typeof params.next === "string" ? params.next : "";

  // Already authenticated — skip login page entirely
  const session = await getPageSession();
  if (session?.user?.id) {
    redirect(getSafeAuthNext(next, "/dashboard") as Route);
  }

  return <AuthForm mode={mode} next={next} />;
}
