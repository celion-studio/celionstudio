"use client";

import type { Route } from "next";
import { motion } from "framer-motion";
import { PricingPlanCard } from "@/components/pricing/PricingPlanCard";
import { pricingPlans } from "@/lib/pricing-plans";
import type { BillingPlanId, PaidBillingPlanId } from "@/lib/billing";
import type { BillingCycle } from "@/lib/pricing-plans";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

type PricingPlanGridProps = {
  actionHref: Route;
  billingCycle?: BillingCycle;
  billingConfigured?: boolean;
  checkoutPendingPlan?: PaidBillingPlanId | "";
  currentPlan?: BillingPlanId;
  portalAvailable?: boolean;
  signedIn?: boolean | null;
  onCheckout?: (plan: PaidBillingPlanId) => void;
};

export function PricingPlanGrid({
  actionHref,
  billingCycle = "monthly",
  billingConfigured = true,
  checkoutPendingPlan = "",
  currentPlan = "starter",
  portalAvailable,
  signedIn,
  onCheckout,
}: PricingPlanGridProps) {
  return (
    <motion.div
      className="pricing-grid"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      aria-label="Celion pricing plans"
    >
      {pricingPlans.map((plan) => (
        <motion.div key={plan.name} variants={cardVariants}>
          <PricingPlanCard
            actionHref={actionHref}
            billingConfigured={billingConfigured}
            billingCycle={billingCycle}
            checkoutPendingPlan={checkoutPendingPlan}
            currentPlan={currentPlan}
            plan={plan}
            portalAvailable={portalAvailable}
            signedIn={signedIn}
            onCheckout={onCheckout}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
