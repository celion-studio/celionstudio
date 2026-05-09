import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

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
      className="dashboard-empty"
      style={{ "--dashboard-empty-max-width": maxWidth } as CSSProperties}
    >
      <div className="dashboard-empty-icon">
        <Icon size={18} color="currentColor" strokeWidth={1.8} />
      </div>
      <h3 className="dashboard-empty-title">
        {title}
      </h3>
      <p className="dashboard-empty-description">
        {description}
      </p>
      {action}
    </div>
  );
}
