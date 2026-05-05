import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";

type DashboardEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  maxWidth?: string;
  action: ReactNode;
};

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  maxWidth = "320px",
  action,
}: DashboardEmptyStateProps) {
  return (
    <div
      style={{
        marginTop: "24px",
        padding: "72px 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          background: CELION_COLOR.controlSoft,
          borderRadius: CELION_RADIUS.control,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <Icon size={18} color={CELION_COLOR.icon} strokeWidth={1.8} />
      </div>
      <h3
        style={{
          margin: "0 0 8px",
          fontFamily: CELION_FONT.display,
          fontSize: "16px",
          fontWeight: 600,
          color: CELION_COLOR.text,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0 auto 20px",
          fontSize: "13.5px",
          color: CELION_COLOR.muted,
          maxWidth,
        }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
