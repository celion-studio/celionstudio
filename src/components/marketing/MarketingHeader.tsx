'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { authClient } from '@/lib/auth-client';

const WORKSPACE_ROUTE = "/dashboard" as Route;
const PRICING_ROUTE = "/pricing" as Route;
const NEW_PROJECT_ROUTE = "/new" as Route;

type MarketingHeaderProps = {
  initialSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
};

export function MarketingHeader({
  initialSignedIn,
  initialUserName,
  initialUserEmail,
}: MarketingHeaderProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authRedirectTo, setAuthRedirectTo] = useState<string>(WORKSPACE_ROUTE);
  const userInitial =
    initialUserName?.charAt(0).toUpperCase() ??
    initialUserEmail?.charAt(0).toUpperCase() ??
    "U";

  function safeRedirectPath(value: string | null) {
    if (value?.startsWith("/") && !value.startsWith("//")) return value;
    return WORKSPACE_ROUTE;
  }

  function openAuth(mode: "sign-in" | "sign-up", redirectTo = WORKSPACE_ROUTE) {
    setAuthMode(mode);
    setAuthRedirectTo(redirectTo);
    setShowAuth(true);
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = safeRedirectPath(searchParams.get("next"));
    const authIntent = searchParams.get("auth");
    const hasVerifier = searchParams.has("neon_auth_session_verifier");

    if (authIntent && !hasVerifier) {
      if (initialSignedIn) {
        window.location.replace(redirectTo);
        return;
      }

      setAuthMode(authIntent === "signup" || authIntent === "sign-up" ? "sign-up" : "sign-in");
      setAuthRedirectTo(redirectTo);
      setShowAuth(true);
      return;
    }

    if (!hasVerifier) return;

    let active = true;
    async function finalizeSignIn() {
      try {
        const result = await authClient.getSession();
        if (!result?.error && active) {
          window.location.replace(redirectTo);
        }
      } catch (err) {
        console.error("Session verification failed", err);
      }
    }

    finalizeSignIn();
    return () => { active = false; };
  }, [initialSignedIn]);

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand" style={{ textDecorationLine: 'none' }}>
            <svg className="brand-spark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
            </svg>
            <span>celion</span>
          </Link>
          <div className="nav-actions">
            <Link href={PRICING_ROUTE} className="nav-link bg-transparent border-none cursor-pointer" style={{ textDecorationLine: 'none' }}>
              Pricing
            </Link>
            {initialSignedIn ? (
              <>
                <Link href={WORKSPACE_ROUTE} className="nav-link bg-transparent border-none cursor-pointer" style={{ textDecorationLine: 'none' }}>
                  Workspace
                </Link>
                <div className="nav-avatar">
                  {userInitial}
                </div>
              </>
            ) : (
              <button className="btn btn-light" onClick={() => openAuth("sign-up", NEW_PROJECT_ROUTE)}>
                Start a draft
              </button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuth(false)}
          redirectTo={authRedirectTo}
        />
      )}
    </>
  );
}
