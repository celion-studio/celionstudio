import type { Route } from 'next';

export function FinalCtaSection({ createHref }: { createHref: Route }) {
  return (
    <section id="export" className="section fade-up">
      <div className="container">
        <div className="cta-band">
          <div className="cta-copy">
            <h3>Start with one idea.</h3>
            <p>Turn it into an editable ebook draft.</p>
          </div>
          <div className="cta-buttons">
            <a href={createHref} className="btn btn-dark btn-inward">Start creating</a>
          </div>
        </div>
      </div>
    </section>
  );
}
