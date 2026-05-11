"use client";

import { useCallback, useEffect, useState } from "react";
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

type UseDashboardBillingInput = {
  open: boolean;
  signedIn: boolean;
};

export function useDashboardBilling({ open, signedIn }: UseDashboardBillingInput) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [billingState, setBillingState] = useState<BillingState>(defaultBillingState);
  const [billingStateLoaded, setBillingStateLoaded] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [checkoutPendingPlan, setCheckoutPendingPlan] = useState<PaidBillingPlanId | "">("");
  const [portalPending, setPortalPending] = useState(false);

  useEffect(() => {
    if (!open || !signedIn || billingStateLoaded) {
      return;
    }

    let active = true;
    setBillingError("");

    async function loadBillingState() {
      try {
        const response = await fetch("/api/billing/state", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { billing?: BillingState; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Could not load billing state.");
        }

        if (active && payload?.billing) {
          setBillingState(payload.billing);
          setBillingStateLoaded(true);
        }
      } catch (caught) {
        if (active) {
          setBillingError(caught instanceof Error ? caught.message : "Could not load billing state.");
        }
      }
    }

    void loadBillingState();

    return () => {
      active = false;
    };
  }, [billingStateLoaded, open, signedIn]);

  const startCheckout = useCallback(async (plan: PaidBillingPlanId) => {
    setBillingError("");
    setCheckoutPendingPlan(plan);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ plan }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; message?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message ?? "Could not create checkout.");
      }

      window.location.assign(payload.url);
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Could not create checkout.");
      setCheckoutPendingPlan("");
    }
  }, []);

  const openPortal = useCallback(async () => {
    setBillingError("");
    setPortalPending(true);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
      });

      if (response.type === "opaqueredirect" || response.status === 0) {
        window.location.assign("/api/billing/portal");
        return;
      }

      if (response.redirected) {
        window.location.assign(response.url);
        return;
      }

      if (response.ok && response.url && !response.url.includes("/api/billing/portal")) {
        window.location.assign(response.url);
        return;
      }

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Could not open billing portal.");
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Could not open billing portal.");
      setPortalPending(false);
    }
  }, []);

  return {
    billingCycle,
    billingError,
    billingState,
    checkoutPendingPlan,
    portalPending,
    setBillingCycle,
    startCheckout,
    openPortal,
  };
}
