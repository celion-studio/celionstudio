import type { Metadata, Route } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingPlanGrid } from "@/components/pricing/PricingPlanGrid";
import { buildAuthHref } from "@/lib/auth-redirect";
import { pricingFaqs, pricingIncluded } from "@/lib/pricing-plans";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing | Celion",
  description:
    "Simple generated-page pricing for turning source material into polished ebooks.",
};

export default async function PricingPage() {
  const session = await getPageSession();
  const actionHref = (session?.user ? "/dashboard" : buildAuthHref("sign-in", "/dashboard")) as Route;

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
            <PricingPlanGrid actionHref={actionHref} />
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
                {pricingIncluded.map((item) => (
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
              {pricingFaqs.map((faq) => (
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
