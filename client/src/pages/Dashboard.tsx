import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, Zap, MessageSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your products, automations, and DM activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {stats.monthlyDmCount >= 100
                    ? "You've reached your monthly DM limit (100/100)."
                    : `You're approaching your monthly DM limit (${stats.monthlyDmCount}/100).`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to Pro for unlimited DM sends.
                </p>
              </div>
              <Button size="sm" onClick={() => setLocation("/pricing")}>
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => setLocation("/products/new")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Create a Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Write an ebook with our editor or upload an existing PDF.
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => setLocation("/automations/new")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Set Up Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define keyword triggers and DM templates for your Instagram posts.
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => setLocation("/logs")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              View DM Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check your DM delivery history, success rates, and errors.
            </p>
          </CardContent>
        </Card>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value ?? 0}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
