"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { FiCreditCard, FiFileText, FiHome, FiSettings, FiTrash2 } from "react-icons/fi";
import { authClient } from "@/lib/auth-client";

export type SidebarItemKey = "home" | "projects" | "trash" | "settings";
type SidebarIconName = SidebarItemKey | "billing";

type WorkspaceSidebarProps = {
  activeItem: SidebarItemKey;
  billingOpen?: boolean;
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  onBillingClick?: () => void;
  primaryAction?: {
    href: Route;
    label: string;
    onClick?: () => void;
  } | null;
};

const NAV_ITEMS: Array<{
  key: SidebarItemKey;
  label: string;
  icon: SidebarIconName;
  href: Route;
}> = [
  { key: "home", label: "Home", icon: "home", href: "/dashboard?view=home" as Route },
  { key: "projects", label: "All projects", icon: "projects", href: "/dashboard?view=projects" as Route },
  { key: "trash", label: "Trash", icon: "trash", href: "/dashboard?view=trash" as Route },
  { key: "settings", label: "Settings", icon: "settings", href: "/dashboard?view=settings" as Route },
];

export const WORKSPACE_SIDEBAR_WIDTH = 280;
export const WORKSPACE_TOP_RAIL_HEIGHT = 56;
export const WORKSPACE_EDGE_GAP = 16;

function WorkspaceSidebarGlyph({ name }: { name: SidebarIconName }) {
  const icons = {
    billing: FiCreditCard,
    home: FiHome,
    projects: FiFileText,
    settings: FiSettings,
    trash: FiTrash2,
  };
  const Icon = icons[name];

  return (
    <Icon
      aria-hidden="true"
      className="workspace-sidebar-glyph"
      size={15}
      strokeWidth={1.8}
    />
  );
}

export function WorkspaceSidebar({
  activeItem,
  billingOpen = false,
  isSignedIn,
  initialUserName,
  initialUserEmail,
  onBillingClick,
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
          const active = !billingOpen && item.key === activeItem;

          return (
            <Link
              key={item.key}
              href={item.href}
              className="workspace-sidebar-link"
              data-active={active ? "true" : "false"}
            >
              <WorkspaceSidebarGlyph name={item.icon} />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          className="workspace-sidebar-link workspace-sidebar-button"
          data-active={billingOpen ? "true" : "false"}
          onClick={onBillingClick}
        >
          <WorkspaceSidebarGlyph name="billing" />
          Billing
        </button>
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
