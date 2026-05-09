import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { buildAuthHref } from "@/lib/auth-redirect";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing | Celion",
  description:
    "Simple generated-page pricing for turning source material into polished ebooks.",
};

type PricingPlan = {
  name: string;
  label: string;
  price: string;
  cadence: string;
  allowance: string;
  overage: string;
  audience: string;
  featured?: boolean;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    name: "Starter",
    label: "Evaluate",
    price: "Free",
    cadence: "to begin",
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
    name: "Studio",
    label: "Most used",
    price: "$29",
    cadence: "per month",
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
    name: "Team",
    label: "Scale",
    price: "$99",
    cadence: "per workspace / month",
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
  {
    name: "Custom",
    label: "Control",
    price: "Custom",
    cadence: "for high-volume teams",
    allowance: "Custom generated-page pool",
    overage: "Contracted rate",
    audience: "For publishers, agencies, and teams with compliance needs.",
    features: [
      "Provider and model policy",
      "Security review support",
      "Custom storage controls",
      "Dedicated onboarding",
    ],
  },
];

const included = [
  "Brief, source, tone, and design setup",
  "Editable ebook workspace",
  "A5 page preview and PDF export",
  "Cloudflare R2-ready media path",
  "No ambiguous credit packs",
  "Input limits enforced before model calls",
];

const faqs = [
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

export default async function PricingPage() {
  const session = await getPageSession();
  const actionHref = (session?.user ? "/dashboard" : buildAuthHref("sign-up", "/dashboard")) as Route;

  return (
    <div className="editorial-landing-page pricing-page">
      <div className="grain-overlay"></div>
      <MarketingHeader
        initialSignedIn={Boolean(session?.user)}
        initialUserName={session?.user?.name ?? null}
        initialUserEmail={session?.user?.email ?? null}
      />

      <main className="pricing-main">
        <section className="pricing-hero">
          <div className="container pricing-container">
            <div className="section-kicker">Pricing</div>
            <h1>Simple pricing for serious ebooks.</h1>
            <p>
              No arbitrary credit packs. Celion prices around generated A5 pages, so long sources and rich publications
              stay visible before the expensive model run begins.
            </p>
            <div className="pricing-proofline">
              <span>brief first</span>
              <span>generated-page allowance</span>
              <span>edit and export included</span>
            </div>
          </div>
        </section>

        <section className="pricing-plans">
          <div className="container pricing-container">
            <div className="pricing-grid" aria-label="Celion pricing plans">
              {plans.map((plan) => (
                <article key={plan.name} className={plan.featured ? "pricing-card pricing-card-featured" : "pricing-card"}>
                  <div className="pricing-card-top">
                    <span className="pricing-plan-label">{plan.label}</span>
                    <h2>{plan.name}</h2>
                    <p>{plan.audience}</p>
                  </div>

                  <div className="pricing-price-block">
                    <div className="pricing-price">{plan.price}</div>
                    <div className="pricing-cadence">{plan.cadence}</div>
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

                  {plan.name === "Custom" ? (
                    <a className="pricing-card-cta" href="mailto:hello@celion.studio">
                      Talk to us
                      <ArrowRight size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <Link className="pricing-card-cta" href={actionHref}>
                      {plan.name === "Starter" ? "Start free" : "Create an ebook"}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-included">
          <div className="container pricing-container">
            <div className="pricing-included-panel">
              <div>
                <div className="section-kicker">Included</div>
                <h2>Every plan keeps the writing room open.</h2>
              </div>
              <ul>
                {included.map((item) => (
                  <li key={item}>
                    <span></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pricing-faq">
          <div className="container pricing-container">
            <div className="section-kicker">Questions</div>
            <h2>Clear before generation.</h2>
            <div className="pricing-faq-list">
              {faqs.map((faq) => (
                <div className="pricing-faq-row" key={faq.q}>
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-final">
          <div className="container pricing-container">
            <h2>Start with a source that deserves a better form.</h2>
            <Link className="btn btn-dark" href={actionHref}>
              Create an ebook
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
