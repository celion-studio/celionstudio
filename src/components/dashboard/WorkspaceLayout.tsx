"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import {
  WORKSPACE_EDGE_GAP,
  WORKSPACE_TOP_RAIL_HEIGHT,
  WorkspaceSidebar,
  type SidebarItemKey,
} from "@/components/dashboard/WorkspaceSidebar";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";

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
    <div
      className="workspace-layout-shell"
      style={{
        display: "flex",
        height: "100vh",
        background: CELION_COLOR.appBg,
        fontFamily: CELION_FONT.body,
        overflow: "hidden",
      }}
    >
      <WorkspaceSidebar
        activeItem={activeItem}
        isSignedIn={isSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        primaryAction={primaryAction}
      />

      <div className="workspace-layout-body" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          className="workspace-layout-header"
          style={{
            height: `${WORKSPACE_TOP_RAIL_HEIGHT}px`,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${WORKSPACE_EDGE_GAP}px`,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: CELION_COLOR.mutedSoft }}>Projects</span>
            <ChevronRight size={12} color="#D4D2CC" />
            <span style={{ fontSize: "13px", fontWeight: 500, color: CELION_COLOR.text }}>
              {breadcrumbCurrent}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.54)",
                borderRadius: CELION_RADIUS.control,
                padding: "5px 10px",
                fontSize: "12px",
                color: CELION_COLOR.muted,
              }}
            >
              <Sparkles size={11} strokeWidth={1.8} />
              <span style={{ fontFamily: CELION_FONT.display }}>AI ready</span>
            </div>
          </div>
        </header>

        <main
          className="workspace-layout-main"
          style={{
            flex: 1,
            overflow: "auto",
            padding: `0 ${WORKSPACE_EDGE_GAP}px ${WORKSPACE_EDGE_GAP}px 0`,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <div
            className="workspace-layout-panel"
            style={{
              flex: 1,
              width: "100%",
              minHeight: `calc(100vh - ${WORKSPACE_TOP_RAIL_HEIGHT + WORKSPACE_EDGE_GAP}px)`,
              background: CELION_COLOR.panel,
              border: `1px solid ${CELION_COLOR.line}`,
              borderRadius: CELION_RADIUS.shell,
              boxShadow: "none",
              boxSizing: "border-box",
              padding: "30px",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
