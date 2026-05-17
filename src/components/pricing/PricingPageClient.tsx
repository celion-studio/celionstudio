"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PricingPlanGrid } from "@/components/pricing/PricingPlanGrid";
import { CelionSegmentedControl } from "@/components/ui/celion-controls";
import type { BillingState, PaidBillingPlanId } from "@/lib/billing";
import type { BillingCycle } from "@/lib/pricing-plans";

const defaultBillingState: BillingState = {
  activePlan: "starter",
  status: "free",
  activeProductId: null,
  activeSubscriptionId: null,
  portalAvailable: false,
  configured: true,
};

export function PricingPageClient() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [billingState, setBillingState] = useState<BillingState>(defaultBillingState);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [checkoutPendingPlan, setCheckoutPendingPlan] = useState<PaidBillingPlanId | "">("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (billingLoaded) return;

    let active = true;
    setBillingError("");

    async function loadBillingState() {
      try {
        const response = await fetch("/api/billing/state", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { billing?: BillingState; message?: string }
          | null;

        if (!response.ok) {
          if (response.status === 401) {
            // Not signed in — show all cards with sign-up CTAs
            setSignedIn(false);
            setBillingLoaded(true);
            return;
          }
          throw new Error(payload?.message ?? "Could not load billing state.");
        }

        if (active && payload?.billing) {
          setBillingState(payload.billing);
          setSignedIn(true);
          setBillingLoaded(true);
        }
      } catch (caught) {
        if (active) {
          setBillingError(caught instanceof Error ? caught.message : "Could not load billing state.");
          setBillingLoaded(true);
        }
      }
    }

    void loadBillingState();

    return () => {
      active = false;
    };
  }, [billingLoaded]);

  const startCheckout = useCallback(async (plan: PaidBillingPlanId) => {
    setBillingError("");
    setCheckoutPendingPlan(plan);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ plan, billingCycle }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; message?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message ?? "Could not create checkout session.");
      }

      window.location.href = payload.url;
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Could not start checkout.");
      setCheckoutPendingPlan("");
    }
  }, [billingCycle]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pricing-cycle-toggle">
        <CelionSegmentedControl
          ariaLabel="Billing cycle"
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "annual", label: "Annual" },
          ]}
          value={billingCycle}
          onChange={(value) => setBillingCycle(value as BillingCycle)}
        />
      </div>

      {billingError ? (
        <div className="pricing-billing-error">
          <p>{billingError}</p>
        </div>
      ) : null}

      <PricingPlanGrid
        actionHref="/auth?mode=sign-up"
        billingCycle={billingCycle}
        billingConfigured={billingState.configured}
        checkoutPendingPlan={checkoutPendingPlan}
        currentPlan={billingState.activePlan}
        portalAvailable={billingState.portalAvailable}
        signedIn={signedIn}
        onCheckout={signedIn ? startCheckout : undefined}
      />
    </motion.div>
  );
}
