"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { BillingPlanId, PaidBillingPlanId } from "@/lib/billing";
import type { BillingCycle, PricingPlan } from "@/lib/pricing-plans";

type PricingPlanCardProps = {
  actionHref: Route;
  billingConfigured: boolean;
  billingCycle: BillingCycle;
  checkoutPendingPlan: PaidBillingPlanId | "";
  currentPlan: BillingPlanId;
  plan: PricingPlan;
  onCheckout?: (plan: PaidBillingPlanId) => void;
};

function paidPlanKey(plan: BillingPlanId): PaidBillingPlanId | null {
  return plan === "studio" || plan === "team" ? plan : null;
}

export function PricingPlanCard({
  actionHref,
  billingConfigured,
  billingCycle,
  checkoutPendingPlan,
  currentPlan,
  plan,
  onCheckout,
}: PricingPlanCardProps) {
  const paidPlan = paidPlanKey(plan.key);
  const isCurrentPlan = plan.key === currentPlan;
  const isPending = checkoutPendingPlan === plan.key;
  const usesCheckout = Boolean(onCheckout) && Boolean(paidPlan);
  const price = billingCycle === "annual" ? plan.annualPrice : plan.price;
  const cadence = billingCycle === "annual" ? plan.annualCadence : plan.cadence;

  return (
    <article className={plan.featured ? "pricing-card pricing-card-featured" : "pricing-card"}>
      <div className="pricing-card-top">
        <span className="pricing-plan-label">{isCurrentPlan ? "Current" : plan.label}</span>
        <h2>{plan.name}</h2>
        <p>{plan.audience}</p>
      </div>

      <div className="pricing-price-block">
        <div className="pricing-price">{price}</div>
        <div className="pricing-cadence">{cadence}</div>
      </div>

      <div className="pricing-usage">
        <span>{plan.allowance}</span>
        <strong>{plan.overage}</strong>
      </div>

      <ul className="pricing-feature-list">
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check size={15} aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button className="pricing-card-cta" type="button" disabled>
          Current plan
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      ) : usesCheckout && paidPlan ? (
        <button
          className="pricing-card-cta"
          type="button"
          disabled={!billingConfigured || isPending}
          onClick={() => onCheckout?.(paidPlan)}
        >
          {!billingConfigured ? "Billing unavailable" : isPending ? "Opening..." : "Upgrade"}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      ) : (
        <Link className="pricing-card-cta" href={actionHref}>
          {plan.key === "starter" ? "Start free" : "Create an ebook"}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
