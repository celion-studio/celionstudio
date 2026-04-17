import { trpc } from "@/lib/trpc";
import { Package, Zap, MessageSquare, TrendingUp, AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your products, automations, and DM activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Products"
          value={stats?.productCount}
          icon={<Package className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Automations"
          value={stats?.activeAutomationCount}
          icon={<Zap className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="DMs This Month"
          value={stats?.monthlyDmCount}
          subtitle={
            stats?.subscriptionStatus === "free"
              ? `/ 100 limit`
              : "Unlimited"
          }
          icon={<MessageSquare className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Success Rate"
          value={
            stats?.totalDmCount
              ? `${Math.round((stats.successDmCount / stats.totalDmCount) * 100)}%`
              : "—"
          }
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      {/* DM Limit Warning */}
      {stats?.subscriptionStatus === "free" &&
        stats.monthlyDmCount >= 80 && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {stats.monthlyDmCount >= 100
                  ? "Monthly DM limit reached (100/100)"
                  : `Approaching DM limit (${stats.monthlyDmCount}/100)`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upgrade to Pro for unlimited sends.
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs h-8" onClick={() => setLocation("/pricing")}>
              Upgrade
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            icon={<Package className="h-4 w-4" />}
            title="Create a Product"
            description="Write an ebook or upload a PDF"
            onClick={() => setLocation("/products/new")}
          />
          <QuickAction
            icon={<Zap className="h-4 w-4" />}
            title="Set Up Automation"
            description="Define keyword triggers and DM templates"
            onClick={() => setLocation("/automations/new")}
          />
          <QuickAction
            icon={<MessageSquare className="h-4 w-4" />}
            title="View DM Logs"
            description="Check delivery history and success rates"
            onClick={() => setLocation("/logs")}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  isLoading,
}: {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="text-muted-foreground/60">{icon}</div>
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold text-foreground">{value ?? 0}</span>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/25 hover:bg-accent/30 transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="text-primary">{icon}</div>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}
