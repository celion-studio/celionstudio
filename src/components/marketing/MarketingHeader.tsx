'use client';

import type { Route } from 'next';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { buildAuthHref } from '@/lib/auth-redirect';
import { authClient } from '@/lib/auth-client';

const WORKSPACE_ROUTE = "/dashboard" as Route;
const PRICING_ROUTE = "/pricing" as Route;
const AUTH_ROUTE = buildAuthHref("sign-in", "/dashboard") as Route;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const userInitial =
    initialUserName?.charAt(0).toUpperCase() ??
    initialUserEmail?.charAt(0).toUpperCase() ??
    "U";
  const userLabel = initialUserName ?? initialUserEmail ?? "Account";

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await authClient.signOut();
    } finally {
      window.location.replace("/");
    }
  }

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
                <div className="nav-profile" ref={profileRef}>
                  <button
                    type="button"
                    className="nav-profile-button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <span className="nav-avatar" aria-hidden="true">
                      {userInitial}
                    </span>
                    <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                    <span className="sr-only">Open account menu</span>
                  </button>
                  {menuOpen ? (
                    <div className="nav-profile-menu" role="menu">
                      <div className="nav-profile-summary">
                        <span className="nav-profile-summary-label">Signed in as</span>
                        <strong>{userLabel}</strong>
                        {initialUserName && initialUserEmail ? (
                          <span>{initialUserEmail}</span>
                        ) : null}
                      </div>
                      <Link
                        href={WORKSPACE_ROUTE}
                        className="nav-profile-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        <LayoutDashboard size={14} strokeWidth={1.9} aria-hidden="true" />
                        Workspace
                      </Link>
                      <button
                        type="button"
                        className="nav-profile-item nav-profile-signout"
                        role="menuitem"
                        onClick={handleSignOut}
                        disabled={signingOut}
                      >
                        <LogOut size={14} strokeWidth={1.9} aria-hidden="true" />
                        {signingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <Link href={AUTH_ROUTE} prefetch={false} className="btn btn-light" style={{ textDecorationLine: 'none' }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
