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

export type SidebarItemKey = "workspace";

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
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar-brand-row">
        <Link
          href="/"
          className="workspace-brand-link"
        >
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
          <span className="workspace-brand-name">
            celion
          </span>
        </Link>
      </div>

      <nav className="workspace-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeItem;

          return (
            <Link
              key={item.key}
              href={item.href}
              className="workspace-sidebar-link"
              data-active={active ? "true" : "false"}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}

      </nav>

      {primaryAction ? (
        <div className="workspace-primary-action-wrap">
          <button
            onClick={() => {
              if (primaryAction.onClick) {
                primaryAction.onClick();
                return;
              }
              router.push(primaryAction.href);
            }}
            disabled={!isSignedIn}
            className="workspace-primary-action"
          >
            <Plus size={14} strokeWidth={2.2} />
            {primaryAction.label}
          </button>
        </div>
      ) : null}

      <div className="workspace-user-row">
        <div className="workspace-user-avatar">
          {userInitial}
        </div>
        <div className="workspace-user-meta">
          <p className="workspace-user-name">
            {userName ?? "Guest"}
          </p>
          <p className="workspace-user-email">
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
            className="workspace-signout"
          >
            <LogOut size={13} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
