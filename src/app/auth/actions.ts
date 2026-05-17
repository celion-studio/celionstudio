"use server";

import type { Route } from "next";
import { auth, isAuthConfigured } from "@/lib/auth";
import { getSafeAuthNext } from "@/lib/auth-redirect";
import { redirect } from "next/navigation";

export type AuthActionResult = { error: string } | null;

export async function signIn(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isAuthConfigured || !auth) {
    return { error: "Authentication is not configured." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: error.message || "Failed to sign in." };
  }

  redirect(getSafeAuthNext(next, "/dashboard") as Route);
}

export async function signUp(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isAuthConfigured || !auth) {
    return { error: "Authentication is not configured." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string;

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const { error } = await auth.signUp.email({ name, email, password });

  if (error) {
    return { error: error.message || "Failed to create account." };
  }

  redirect(getSafeAuthNext(next, "/dashboard") as Route);
}

export async function signOut() {
  if (!isAuthConfigured || !auth) return;
  await auth.signOut();
  redirect("/" as Route);
}
