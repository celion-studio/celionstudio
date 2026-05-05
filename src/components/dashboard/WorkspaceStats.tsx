import type { LucideIcon } from "lucide-react";
import {
  CELION_COLOR,
  CELION_FONT,
  CELION_RADIUS,
} from "@/components/ui/celion-style";

export type WorkspaceStat = {
  label: string;
  value: number;
  icon: LucideIcon;
};

type WorkspaceStatsProps = {
  stats: WorkspaceStat[];
};

export function WorkspaceStats({ stats }: WorkspaceStatsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        marginBottom: "28px",
        background: CELION_COLOR.panelSoft,
        borderRadius: CELION_RADIUS.control,
        overflow: "hidden",
      }}
    >
      {stats.map(({ label, value, icon: Icon }, index) => (
        <div
          key={label}
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            borderLeft: index === 0 ? "none" : `1px solid ${CELION_COLOR.warmLine}`,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              background: CELION_COLOR.controlSoft,
              borderRadius: CELION_RADIUS.control,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={15} color={CELION_COLOR.icon} strokeWidth={1.8} />
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "22px",
                fontFamily: CELION_FONT.display,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: CELION_COLOR.text,
              }}
            >
              {value}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: CELION_COLOR.mutedSoft }}>
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
