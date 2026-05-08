"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

type RedirectTarget = string | (() => string);

type UseNeonAuthVerifierRedirectOptions = {
  enabled?: boolean;
  redirectTo?: RedirectTarget;
  onError?: () => void;
};

function currentUrlHasVerifier() {
  return new URLSearchParams(window.location.search).has("neon_auth_session_verifier");
}

function resolveRedirectTarget(target: RedirectTarget) {
  return typeof target === "function" ? target() : target;
}

export function useNeonAuthVerifierRedirect({
  enabled = true,
  redirectTo = "/dashboard",
  onError,
}: UseNeonAuthVerifierRedirectOptions = {}) {
  useEffect(() => {
    if (!enabled || !currentUrlHasVerifier()) return;

    let active = true;

    async function finalizeSignIn() {
      try {
        const result = await authClient.getSession();
        if (!active) return;

        if (result?.error) {
          onError?.();
          return;
        }

        window.location.replace(resolveRedirectTarget(redirectTo));
      } catch (err) {
        console.error("Session verification failed", err);
        if (active) {
          onError?.();
        }
      }
    }

    void finalizeSignIn();

    return () => {
      active = false;
    };
  }, [enabled, onError, redirectTo]);
}
