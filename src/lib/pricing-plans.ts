export type BillingCycle = "monthly" | "annual";

export type PricingPlan = {
  key: "starter" | "studio" | "team";
  name: string;
  label: string;
  price: string;
  cadence: string;
  annualPrice: string;
  annualCadence: string;
  allowance: string;
  overage: string;
  audience: string;
  featured?: boolean;
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    label: "Evaluate",
    price: "Free",
    cadence: "to begin",
    annualPrice: "Free",
    annualCadence: "to begin",
    allowance: "First 40 generated pages",
    overage: "$0.20 / extra page",
    audience: "For testing Celion with one real source.",
    features: [
      "Brief-first ebook setup",
      "Editable A5 preview",
      "PDF export",
      "Source-led planning",
    ],
  },
  {
    key: "studio",
    name: "Creator",
    label: "Most used",
    price: "$29",
    cadence: "per month",
    annualPrice: "$290",
    annualCadence: "per year",
    allowance: "240 generated pages included",
    overage: "$0.12 / extra page",
    audience: "For founders and creators shipping ebooks regularly.",
    featured: true,
    features: [
      "Full project workspace",
      "Saved draft workspace",
      "R2-backed asset delivery",
      "Server-side generation safeguards",
    ],
  },
  {
    key: "team",
    name: "Studio",
    label: "Scale",
    price: "$99",
    cadence: "per workspace / month",
    annualPrice: "$990",
    annualCadence: "per workspace / year",
    allowance: "1,000 generated pages included",
    overage: "$0.09 / extra page",
    audience: "For agencies and teams producing client-ready materials.",
    features: [
      "Agency onboarding review",
      "Brand direction setup",
      "Larger generated-page allowance",
      "Priority launch support",
    ],
  },
];

export const pricingIncluded = [
  "Brief, source, tone, and design setup",
  "Editable ebook workspace",
  "A5 page preview and PDF export",
  "Cloudflare R2-ready media path",
  "No ambiguous credit packs",
  "Input limits enforced before model calls",
];

export const pricingFaqs = [
  {
    q: "Why generated-page pricing?",
    a: "It matches how Celion actually works. The model plans the ebook length from the source, then the billable unit is the finished A5 page.",
  },
  {
    q: "Do users choose the page count?",
    a: "No. The wizard should stay focused on the brief. Celion plans the publication length from source density and blocks oversized inputs before the model run.",
  },
  {
    q: "Does editing cost more?",
    a: "Manual editing, workspace access, and export are not metered. The expensive unit is full AI generation.",
  },
  {
    q: "Can this change before launch?",
    a: "Yes. These tiers are shaped for early access, but the product principle should stay the same: clear allowance, clear overage, no credit fog.",
  },
];
