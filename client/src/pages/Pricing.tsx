import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, Crown, Zap } from "lucide-react";
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
        toast.error(data.message || "Checkout is not available. Please configure Polar API keys.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const manageMutation = trpc.billing.manageSubscription.useMutation({
    onSuccess: (data: any) => {
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      } else {
        toast.error(data.message || "Subscription portal is not available.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Pricing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the plan that fits your creator journey.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Free Plan */}
        <div className={`rounded-xl border bg-card p-6 ${subscriptionStatus === "free" ? "border-primary/30" : "border-border"}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Free</span>
            {subscriptionStatus === "free" && (
              <Badge variant="secondary" className="text-[10px] h-5">Current</Badge>
            )}
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-foreground">$0</span>
            <span className="text-sm text-muted-foreground ml-1">/month</span>
          </div>
          <ul className="space-y-2.5 mb-6">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          {subscriptionStatus === "free" && (
            <Button variant="outline" className="w-full h-9 text-xs bg-transparent" disabled>
              Current Plan
            </Button>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`rounded-xl border-2 bg-card p-6 relative ${subscriptionStatus === "pro" ? "border-primary" : "border-primary/40"}`}>
          <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full uppercase tracking-wider flex items-center gap-1">
            <Crown className="h-2.5 w-2.5" />
            Popular
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Pro</span>
            {subscriptionStatus === "pro" && (
              <Badge className="text-[10px] h-5">Active</Badge>
            )}
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-foreground">$29</span>
            <span className="text-sm text-muted-foreground ml-1">/month</span>
          </div>
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[13px] text-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          {subscriptionStatus === "pro" ? (
            <Button
              variant="outline"
              className="w-full h-9 text-xs bg-transparent"
              onClick={() => manageMutation.mutate()}
              disabled={manageMutation.isPending}
            >
              Manage Subscription
            </Button>
          ) : (
            <Button
              className="w-full h-9 text-xs"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              {checkoutMutation.isPending ? "Loading..." : "Upgrade to Pro"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Payments are processed securely via Polar. Cancel anytime.
      </p>
    </div>
  );
}
