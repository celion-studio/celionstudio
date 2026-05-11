"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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
  return (
    <div className="workspace-shell">
      <WorkspaceSidebar
        activeItem={activeItem}
        billingOpen={billingOpen}
        isSignedIn={isSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        onBillingClick={onBillingClick}
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
