"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";

export type SidebarItemKey = "workspace" | "new";

type WorkspaceSidebarProps = {
  activeItem: SidebarItemKey;
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  primaryAction?: {
    href: Route;
    label: string;
    onClick?: () => void;
  } | null;
};

const NAV_ITEMS: Array<{
  key: SidebarItemKey;
  label: string;
  icon: LucideIcon;
  href: Route;
}> = [
  { key: "workspace", label: "Projects", icon: LayoutDashboard, href: "/dashboard" },
  { key: "new", label: "New project", icon: Plus, href: "/new" },
];

export const WORKSPACE_SIDEBAR_WIDTH = 280;
export const WORKSPACE_TOP_RAIL_HEIGHT = 56;
export const WORKSPACE_EDGE_GAP = 16;

export function WorkspaceSidebar({
  activeItem,
  isSignedIn,
  initialUserName,
  initialUserEmail,
  primaryAction = null,
}: WorkspaceSidebarProps) {
  const router = useRouter();

  const userName = initialUserName;
  const userEmail = initialUserEmail;
  const userInitial =
    userName?.charAt(0).toUpperCase() ??
    userEmail?.charAt(0).toUpperCase() ??
    "U";

  return (
    <aside
      className="workspace-sidebar"
      style={{
        width: `${WORKSPACE_SIDEBAR_WIDTH}px`,
        flexShrink: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: `${WORKSPACE_TOP_RAIL_HEIGHT}px`,
          display: "flex",
          alignItems: "center",
          padding: `0 ${WORKSPACE_EDGE_GAP}px`,
          boxSizing: "border-box",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "10px", textDecorationLine: "none" }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              background: CELION_COLOR.ink,
              borderRadius: CELION_RADIUS.control,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: CELION_FONT.display,
              fontSize: "15px",
              fontWeight: 600,
              color: CELION_COLOR.text,
              letterSpacing: "-0.02em",
            }}
          >
            celion
          </span>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: `0 ${WORKSPACE_EDGE_GAP - 6}px 12px`, display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeItem;

          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: CELION_RADIUS.control,
                textDecorationLine: "none",
                fontSize: "13.5px",
                fontWeight: active ? 500 : 400,
                color: active ? CELION_COLOR.text : CELION_COLOR.muted,
                background: active ? CELION_COLOR.controlSoft : "transparent",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}

      </nav>

      {primaryAction ? (
        <div style={{ padding: `12px ${WORKSPACE_EDGE_GAP - 6}px` }}>
          <button
            onClick={() => {
              if (primaryAction.onClick) {
                primaryAction.onClick();
                return;
              }
              router.push(primaryAction.href);
            }}
            disabled={!isSignedIn}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "9px 0",
              background: CELION_COLOR.ink,
              color: CELION_COLOR.white,
              border: "none",
              borderRadius: CELION_RADIUS.control,
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: CELION_FONT.display,
              cursor: isSignedIn ? "pointer" : "not-allowed",
              opacity: isSignedIn ? 1 : 0.4,
              transition: "opacity 0.15s ease",
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            {primaryAction.label}
          </button>
        </div>
      ) : null}

      <div
        style={{
          padding: `12px ${WORKSPACE_EDGE_GAP}px 16px`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            background: CELION_COLOR.ink,
            borderRadius: CELION_RADIUS.round,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
            color: CELION_COLOR.white,
            flexShrink: 0,
          }}
        >
          {userInitial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 500,
              color: CELION_COLOR.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {userName ?? "Guest"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              color: CELION_COLOR.mutedSoft,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {userEmail ?? ""}
          </p>
        </div>
        {isSignedIn ? (
          <button
            onClick={() => {
              void authClient.signOut().finally(() => {
                window.location.replace("/");
              });
            }}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: CELION_COLOR.mutedSoft,
              display: "flex",
              alignItems: "center",
            }}
          >
            <LogOut size={13} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
