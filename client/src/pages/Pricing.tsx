import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Crown, Zap } from "lucide-react";
import { toast } from "sonner";

const FREE_FEATURES = [
  "Up to 3 products",
  "100 DMs / month",
  "Basic markdown editor",
  "3 automation rules",
  "DM delivery logs",
];

const PRO_FEATURES = [
  "Unlimited products",
  "Unlimited DMs / month",
  "Premium editor + PDF export",
  "Unlimited automation rules",
  "Advanced analytics",
  "Priority support",
  "No watermark on PDFs",
];

export default function Pricing() {
  const { data: me } = trpc.auth.me.useQuery();
  const subscriptionStatus = (me as any)?.subscriptionStatus ?? "free";

  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data: any) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      } else {
        toast.error(data.message || "Checkout is not available. Please configure Polar API keys in Settings > Secrets.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const manageMutation = trpc.billing.manageSubscription.useMutation({
    onSuccess: (data: any) => {
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      } else {
        toast.error(data.message || "Subscription portal is not available. Please configure Polar API keys in Settings > Secrets.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that fits your creator journey.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className={subscriptionStatus === "free" ? "border-primary/50" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Free</CardTitle>
              {subscriptionStatus === "free" && (
                <Badge variant="outline">Current Plan</Badge>
              )}
            </div>
            <div className="mt-2">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {subscriptionStatus === "free" && (
              <Button variant="outline" className="w-full mt-6 bg-transparent" disabled>
                Current Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={`border-2 ${subscriptionStatus === "pro" ? "border-primary" : "border-primary/50"} relative`}>
          <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-medium px-3 py-0.5 rounded-full flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Recommended
          </div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pro</CardTitle>
              {subscriptionStatus === "pro" && (
                <Badge>Active</Badge>
              )}
            </div>
            <div className="mt-2">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {subscriptionStatus === "pro" ? (
              <Button
                variant="outline"
                className="w-full mt-6 bg-transparent"
                onClick={() => manageMutation.mutate()}
                disabled={manageMutation.isPending}
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                className="w-full mt-6"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                <Zap className="mr-2 h-4 w-4" />
                {checkoutMutation.isPending ? "Loading..." : "Upgrade to Pro"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Payments are processed securely via Polar. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
