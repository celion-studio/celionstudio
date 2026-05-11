"use client";

import type { Route } from "next";
import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PricingPlanGrid } from "@/components/pricing/PricingPlanGrid";
import { CelionSegmentedControl } from "@/components/ui/celion-controls";
import type { BillingState, PaidBillingPlanId } from "@/lib/billing";
import type { BillingCycle } from "@/lib/pricing-plans";

type BillingDialogProps = {
  billingCycle: BillingCycle;
  billingError: string;
  billingState: BillingState;
  checkoutPendingPlan: PaidBillingPlanId | "";
  open: boolean;
  portalPending: boolean;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onCheckout: (plan: PaidBillingPlanId) => void;
  onClose: () => void;
  onOpenPortal: () => void;
};

export function BillingDialog({
  billingCycle,
  billingError,
  billingState,
  checkoutPendingPlan,
  open,
  portalPending,
  onBillingCycleChange,
  onCheckout,
  onClose,
  onOpenPortal,
}: BillingDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="dashboard-modal-layer"
          role="presentation"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <motion.section
            className="pricing-page dashboard-pricing-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-pricing-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="dashboard-pricing-dialog-head">
              <div className="dashboard-pricing-dialog-copy">
                <h2 id="dashboard-pricing-dialog-title">Choose the pace for your next ebook.</h2>
                <p>
                  Start free, then upgrade when Celion becomes part of your publishing workflow.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-modal-close"
                aria-label="Close plan and billing"
                onClick={onClose}
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            </div>

            <div className="dashboard-billing-cycle">
              <CelionSegmentedControl<BillingCycle>
                ariaLabel="Billing cycle"
                onChange={onBillingCycleChange}
                options={[
                  { label: "Monthly", value: "monthly" },
                  {
                    disabled: true,
                    label: "Annual soon",
                    title: "Annual billing is coming soon",
                    value: "annual",
                  },
                ]}
                tone="soft"
                value={billingCycle}
                width="220px"
              />
            </div>

            {billingError ? (
              <p className="dashboard-billing-error">{billingError}</p>
            ) : null}

            <PricingPlanGrid
              actionHref={"/dashboard" as Route}
              billingCycle={billingCycle}
              billingConfigured={billingState.configured}
              checkoutPendingPlan={checkoutPendingPlan}
              currentPlan={billingState.activePlan}
              onCheckout={onCheckout}
            />

            <div className="dashboard-billing-footer">
              <div className="dashboard-billing-manage">
                <div>
                  <strong>Payment settings</strong>
                  <span>Manage invoices, payment method, and subscription details.</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenPortal}
                  disabled={!billingState.portalAvailable || portalPending}
                >
                  {portalPending
                    ? "Opening..."
                    : billingState.portalAvailable
                      ? "Manage billing"
                      : "Available after upgrade"}
                </button>
              </div>
              <p className="dashboard-billing-legal">
                Privacy policy and Terms of Service will be available before launch.
              </p>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
