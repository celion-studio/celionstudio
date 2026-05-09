"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import {
  WorkspaceSidebar,
  type SidebarItemKey,
} from "@/components/dashboard/WorkspaceSidebar";

type WorkspaceLayoutProps = {
  activeItem: SidebarItemKey;
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  breadcrumbCurrent: string;
  primaryAction?: ComponentProps<typeof WorkspaceSidebar>["primaryAction"];
  children: ReactNode;
};

export function WorkspaceLayout({
  activeItem,
  isSignedIn,
  initialUserName,
  initialUserEmail,
  breadcrumbCurrent,
  primaryAction = null,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="workspace-shell">
      <WorkspaceSidebar
        activeItem={activeItem}
        isSignedIn={isSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        primaryAction={primaryAction}
      />

      <div className="workspace-main-column">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <span className="workspace-breadcrumb-root">Projects</span>
            <ChevronRight size={12} color="var(--celion-warm-line)" />
            <span className="workspace-breadcrumb-current">
              {breadcrumbCurrent}
            </span>
          </div>

          <div className="workspace-topbar-actions">
            <div className="workspace-ai-ready">
              <Sparkles size={11} strokeWidth={1.8} />
              <span>AI ready</span>
            </div>
          </div>
        </header>

        <main className="workspace-main">
          <div className="workspace-content-panel">
            <div className="workspace-content-inner">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
