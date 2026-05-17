import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingPageClient } from "@/components/pricing/PricingPageClient";
import { pricingFaqs, pricingIncluded } from "@/lib/pricing-plans";
import { getPageSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pricing | Celion",
  description:
    "Simple generated-page pricing for turning source material into polished ebooks.",
};

export default async function PricingPage() {
  const session = await getPageSession();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <div className="editorial-landing-page pricing-page">
      <MarketingHeader user={user} />

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
            <PricingPageClient />
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
            <Link
              className="btn btn-dark"
              href={session?.user ? "/dashboard" : "/auth?mode=sign-up"}
              prefetch={false}
            >
              {session?.user ? "Create an ebook" : "Sign up free"}
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
