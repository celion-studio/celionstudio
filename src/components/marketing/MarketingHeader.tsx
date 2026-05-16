'use client';

import type { Route } from 'next';
import Link from 'next/link';

const PRICING_ROUTE = "/pricing" as Route;

export function MarketingHeader() {
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
            <span
              aria-disabled="true"
              className="btn btn-light"
              style={{ textDecorationLine: 'none' }}
            >
              Sign in
            </span>
          </div>
        </div>
      </nav>
    </>
  );
}
