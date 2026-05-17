import type { Route } from 'next';

export function PricingTeaserSection({
  createHref,
}: {
  createHref: Route;
}) {
  return (
    <section id="pricing" className="section pricing-teaser-section">
      <div className="container">
        <div className="pricing-teaser-row fade-up">
          <div className="pricing-teaser-plan">
            <div className="pricing-teaser-name">Starter</div>
            <div className="pricing-teaser-figure">
              <span className="pricing-teaser-amount">$0</span>
              <span className="pricing-teaser-period">to begin</span>
            </div>
            <ul className="pricing-teaser-features">
              <li>Brief-first ebook setup</li>
              <li>First 40 generated pages</li>
              <li>Editable A5 preview</li>
              <li>PDF export</li>
            </ul>
            <a href={createHref} className="btn btn-light">Get started</a>
          </div>
          <div className="pricing-teaser-divider" />
          <div className="pricing-teaser-plan pricing-teaser-plan--pro">
            <div className="pricing-teaser-name">Creator</div>
            <div className="pricing-teaser-figure">
              <span className="pricing-teaser-amount">$29</span>
              <span className="pricing-teaser-period">/month</span>
            </div>
            <ul className="pricing-teaser-features">
              <li>240 generated pages included</li>
              <li>Full project workspace</li>
              <li>Saved draft workspace</li>
              <li>Server-side generation safeguards</li>
            </ul>
            <a href={createHref} className="btn btn-dark">See pricing</a>
          </div>
        </div>
        <div className="pricing-teaser-footnote fade-up">
          <span>Simple per-page pricing, no hidden fees.</span>
        </div>
      </div>
    </section>
  );
}
