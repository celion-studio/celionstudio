"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { authClient } from "@/lib/auth-client";
import { NEON_AUTH_VERIFIER_PARAM } from "@/lib/auth-redirect";

/**
 * Handles the OAuth callback verifier (neon_auth_session_verifier) on the
 * client side. The verifier is a one-time token that Neon Auth appends to
 * the callback URL after OAuth. The client SDK must send it back to the
 * auth server to establish the session cookie.
 *
 * Place this inside any protected page that receives OAuth redirects.
 */
export function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifier = searchParams?.get(NEON_AUTH_VERIFIER_PARAM);
    if (!verifier) return;

    function clearVerifier() {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete(NEON_AUTH_VERIFIER_PARAM);
      const query = params.toString();
      const path =
        typeof window !== "undefined"
          ? window.location.pathname
          : "/dashboard";
      router.replace((path + (query ? `?${query}` : "")) as Route);
    }

    authClient.getSession().then(clearVerifier).catch(() => {
      // Even if getSession fails (network error, etc.), remove the stale
      // verifier from the URL so it does not linger on subsequent renders.
      clearVerifier();
    });
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
