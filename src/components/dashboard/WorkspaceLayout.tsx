"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import {
  WorkspaceSidebar,
  type SidebarItemKey,
} from "@/components/dashboard/WorkspaceSidebar";

type WorkspaceLayoutProps = {
  activeItem: SidebarItemKey;
  billingOpen?: boolean;
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  breadcrumbCurrent: string;
  breadcrumbRoot?: string;
  onBillingClick?: () => void;
  primaryAction?: ComponentProps<typeof WorkspaceSidebar>["primaryAction"];
  children: ReactNode;
};

export function WorkspaceLayout({
  activeItem,
  billingOpen = false,
  isSignedIn,
  initialUserName,
  initialUserEmail,
  breadcrumbCurrent,
  breadcrumbRoot = "Workspace",
  onBillingClick,
  primaryAction = null,
  children,
}: WorkspaceLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userInitial =
    initialUserName?.charAt(0).toUpperCase() ??
    initialUserEmail?.charAt(0).toUpperCase() ??
    "U";
  const userLabel = initialUserName ?? initialUserEmail ?? "Guest";

  return (
    <div className="workspace-shell" data-mobile-menu-open={mobileMenuOpen ? "true" : "false"}>
      <header className="workspace-mobile-header">
        <Link href="/" className="workspace-brand-link">
          <div className="workspace-brand-mark">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
            </svg>
          </div>
          <span className="workspace-brand-name">celion</span>
        </Link>

        <div className="workspace-mobile-actions">
          <div className="workspace-mobile-user" title={userLabel}>
            <span className="workspace-user-avatar">{userInitial}</span>
            <span>{userLabel}</span>
          </div>
          <button
            type="button"
            className="workspace-mobile-menu-button"
            aria-label={mobileMenuOpen ? "Close workspace menu" : "Open workspace menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={17} strokeWidth={1.9} /> : <Menu size={18} strokeWidth={1.9} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <button
          type="button"
          className="workspace-mobile-backdrop"
          aria-label="Close workspace menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <WorkspaceSidebar
        activeItem={activeItem}
        billingOpen={billingOpen}
        isSignedIn={isSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        onBillingClick={onBillingClick}
        onNavigate={() => setMobileMenuOpen(false)}
        primaryAction={primaryAction}
      />

      <div className="workspace-main-column">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <span className="workspace-breadcrumb-root">{breadcrumbRoot}</span>
            <ChevronRight size={12} color="var(--celion-warm-line)" />
            <span className="workspace-breadcrumb-current">
              {breadcrumbCurrent}
            </span>
          </div>

        </header>

        <main className="workspace-main">
          <div className="workspace-content-panel">
            <div className="workspace-content-inner" data-view={activeItem}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
