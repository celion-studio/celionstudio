'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from 'next';
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";

const PRICING_ROUTE = "/pricing" as Route;
const DASHBOARD_ROUTE = "/dashboard" as Route;

function UserAvatar({
  user,
}: {
  user: { name: string | null; email: string | null; image: string | null };
}) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  if (user.image) {
    return (
      <img
        src={user.image}
        alt={user.name ?? "User"}
        className="nav-avatar"
        width="28"
        height="28"
      />
    );
  }

  return <span className="nav-avatar nav-avatar-fallback">{initial}</span>;
}

function ProfileMenu({
  user,
}: {
  user: { name: string | null; email: string | null; image: string | null };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => setOpen((prev) => !prev), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-profile" ref={ref}>
      <button
        type="button"
        className="nav-profile-button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar user={user} />
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="nav-profile-chevron"
          data-open={open ? "true" : "false"}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-profile-menu"
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="nav-profile-arrow" aria-hidden="true" />
            <div className="nav-profile-summary">
              <span className="nav-profile-summary-label">Signed in as</span>
              <strong>{user.name ?? "User"}</strong>
              <span>{user.email ?? ""}</span>
            </div>
            <div className="nav-profile-actions">
              <Link
                href={DASHBOARD_ROUTE}
                className="nav-profile-item"
                onClick={handleClose}
              >
                <LayoutDashboard size={15} strokeWidth={1.8} />
                Dashboard
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="nav-profile-item nav-profile-signout"
                  role="menuitem"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  Sign out
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MarketingHeader({
  user = null,
}: {
  user?: { name: string | null; email: string | null; image: string | null } | null;
}) {
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
            {user ? (
              <ProfileMenu user={user} />
            ) : (
              <Link
                href="/auth?mode=sign-in"
                className="btn btn-light"
                style={{ textDecorationLine: 'none' }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
