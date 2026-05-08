'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useAuthModal } from '@/components/auth/use-auth-modal';
import { useNeonAuthVerifierRedirect } from '@/components/auth/use-neon-auth-verifier';

const WORKSPACE_ROUTE = "/dashboard" as Route;
const PRICING_ROUTE = "/pricing" as Route;

type MarketingHeaderProps = {
  initialSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  onStartDraft?: () => void;
};

export function MarketingHeader({
  initialSignedIn,
  initialUserName,
  initialUserEmail,
  onStartDraft,
}: MarketingHeaderProps) {
  const { authModal, openAuthModal } = useAuthModal();
  const handleStartDraft = onStartDraft ?? openAuthModal;
  const userInitial =
    initialUserName?.charAt(0).toUpperCase() ??
    initialUserEmail?.charAt(0).toUpperCase() ??
    "U";

  useNeonAuthVerifierRedirect({ redirectTo: WORKSPACE_ROUTE });

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
              <button className="btn btn-light" onClick={handleStartDraft}>
                Start a draft
              </button>
            )}
          </div>
        </div>
      </nav>

      {onStartDraft ? null : authModal}
    </>
  );
}
