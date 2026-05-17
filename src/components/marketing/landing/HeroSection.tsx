import type { Route } from 'next';
import Link from 'next/link';

export function HeroSection({
  createHref,
  pricingHref,
}: {
  createHref: Route;
  pricingHref: Route;
}) {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-copy">
          <div className="hero-icon fade-up">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32"/>
            </svg>
          </div>
          <h1 className="font-geist">
            <span>Turn your ideas</span>
            {' '}
            <span>into beautiful ebooks.</span>
          </h1>
          <p className="font-geist">
            Bring notes, research, or source material. Celion turns it into editable ebook pages you can refine, export, and share.
          </p>
          <div className="hero-actions fade-up">
            <a href={createHref} className="btn btn-dark hero-cta-primary">
              Start creating
            </a>
            <Link href={pricingHref} className="btn btn-light hero-cta-secondary">
              View pricing
            </Link>
          </div>
        </div>

        <div className="hero-studio-mockup fade-up" aria-label="Celion ebook studio preview">
          <div className="studio-window" aria-hidden="true">
            <div className="studio-window-chrome">
              <div className="studio-window-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="studio-window-title">Celion / Ebook Studio</div>
              <div className="studio-window-status">Editable output</div>
            </div>
            <div className="studio-window-tabs">
              <span>01 Source</span>
              <span>02 Plan</span>
              <span data-active="true">03 Pages</span>
              <span>04 Export</span>
            </div>
            <div className="studio-window-body">
              <div className="studio-source-pane">
                <div className="studio-source-meta">
                  <span>Notes</span>
                  <span>Research</span>
                  <span>Transcript</span>
                </div>
                <h3>From a rough idea to a structured draft.</h3>
                <p>
                  Paste notes, research, or transcripts. Celion turns the useful parts into a clear ebook plan before writing.
                </p>
                <div className="studio-source-card">
                  <div className="studio-source-card-head">
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginRight: 6 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Source notes
                    </span>
                    <span>3 inputs</span>
                  </div>
                  <div className="studio-source-note">
                    <span></span>
                    <p>Reader needs a practical system for turning ideas into structured drafts without getting lost in the process.</p>
                  </div>
                  <div className="studio-source-note">
                    <span></span>
                    <p>Use diagnosis, rhythm, and review as the three pillars of the writing method.</p>
                  </div>
                  <div className="studio-source-quote">
                    <span>Reader promise</span>
                    <strong>Make the method clear enough to finish.</strong>
                  </div>
                  <div className="studio-source-outline">
                    <div>
                      <span>01</span>
                      <strong>Promise</strong>
                    </div>
                    <div>
                      <span>02</span>
                      <strong>Chapters</strong>
                    </div>
                    <div>
                      <span>03</span>
                      <strong>Pages</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-output-pane">
                <div className="studio-page-sheet">
                  <div className="studio-page-meta">
                    <span>Creator Guide</span>
                    <span>Page 03</span>
                  </div>
                  <div className="studio-page-title-block">
                    <span>Chapter 01</span>
                    <h2>Shape the promise.</h2>
                    <p>
                      Start with the reader, outcome, and page structure.
                    </p>
                  </div>
                  <div className="studio-page-accent" aria-hidden="true"></div>
                  <div className="studio-page-rule"></div>
                  <div className="studio-page-body">
                    <p>
                      The promise is the contract between you and the reader. It answers what they will be able to do after reading.
                    </p>
                  </div>
                  <div className="studio-page-grid">
                    <div>
                      <span>01</span>
                      <strong>Source</strong>
                      <p>Paste notes, research, and transcripts into the editor.</p>
                    </div>
                    <div>
                      <span>02</span>
                      <strong>Pages</strong>
                      <p>Each page becomes an editable section in the final draft.</p>
                    </div>
                  </div>
                  <div className="studio-page-footer">
                    <span>Celion Ebook Studio</span>
                    <span>03</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
