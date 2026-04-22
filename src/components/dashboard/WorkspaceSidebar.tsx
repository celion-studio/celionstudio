"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type SidebarItemKey = "workspace" | "new" | "settings";

type WorkspaceSidebarProps = {
  activeItem: SidebarItemKey;
  isSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
  primaryAction?: {
    href: Route;
    label: string;
  } | null;
};

const NAV_ITEMS: Array<{
  key: SidebarItemKey;
  label: string;
  icon: LucideIcon;
  href: Route;
}> = [
  { key: "workspace", label: "Workspace", icon: LayoutDashboard, href: "/dashboard" },
  { key: "new", label: "New ebook", icon: Plus, href: "/new" },
  { key: "settings", label: "Settings", icon: Settings, href: "/dashboard" },
];

export function WorkspaceSidebar({
  activeItem,
  isSignedIn,
  initialUserName,
  initialUserEmail,
  primaryAction = null,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const userName = session?.user?.name ?? initialUserName;
  const userEmail = session?.user?.email ?? initialUserEmail;
  const userInitial =
    userName?.charAt(0).toUpperCase() ??
    userEmail?.charAt(0).toUpperCase() ??
    "U";

  return (
    <aside
      style={{
        width: "220px",
        flexShrink: 0,
        background: "#FFFFFF",
        borderRight: "1px solid #ECEAE5",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #ECEAE5" }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "10px", textDecorationLine: "none" }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              background: "#111",
              borderRadius: "8px",
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
              fontFamily: "'Geist', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              color: "#111",
              letterSpacing: "-0.02em",
            }}
          >
            celion
          </span>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
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
                borderRadius: "8px",
                textDecorationLine: "none",
                fontSize: "13.5px",
                fontWeight: active ? 500 : 400,
                color: active ? "#111" : "#71717A",
                background: active ? "#F0EEE9" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}

      </nav>

      {primaryAction ? (
        <div style={{ padding: "12px 10px", borderTop: "1px solid #ECEAE5" }}>
          <button
            onClick={() => router.push(primaryAction.href)}
            disabled={!isSignedIn}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "9px 0",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
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
          padding: "12px 16px 16px",
          borderTop: "1px solid #ECEAE5",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            background: "#111",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
            color: "#fff",
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
              color: "#111",
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
              color: "#A1A1AA",
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
            onClick={() => authClient.signOut().then(() => window.location.replace("/"))}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#A1A1AA",
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
