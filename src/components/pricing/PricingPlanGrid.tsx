"use client";

import type { Route } from "next";
import { PricingPlanCard } from "@/components/pricing/PricingPlanCard";
import { pricingPlans } from "@/lib/pricing-plans";
import type { BillingPlanId, PaidBillingPlanId } from "@/lib/billing";
import type { BillingCycle } from "@/lib/pricing-plans";

type PricingPlanGridProps = {
  actionHref: Route;
  billingCycle?: BillingCycle;
  billingConfigured?: boolean;
  checkoutPendingPlan?: PaidBillingPlanId | "";
  currentPlan?: BillingPlanId;
  onCheckout?: (plan: PaidBillingPlanId) => void;
};

export function PricingPlanGrid({
  actionHref,
  billingCycle = "monthly",
  billingConfigured = true,
  checkoutPendingPlan = "",
  currentPlan = "starter",
  onCheckout,
}: PricingPlanGridProps) {
  return (
    <div className="pricing-grid" aria-label="Celion pricing plans">
      {pricingPlans.map((plan) => (
        <PricingPlanCard
          key={plan.name}
          actionHref={actionHref}
          billingConfigured={billingConfigured}
          billingCycle={billingCycle}
          checkoutPendingPlan={checkoutPendingPlan}
          currentPlan={currentPlan}
          plan={plan}
          onCheckout={onCheckout}
        />
      ))}
    </div>
  );
}
