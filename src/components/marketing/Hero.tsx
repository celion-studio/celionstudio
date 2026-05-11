'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { buildAuthHref } from '@/lib/auth-redirect';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

type HeroProps = {
  initialSignedIn: boolean;
  initialUserName: string | null;
  initialUserEmail: string | null;
};

export function Hero({
  initialSignedIn,
  initialUserName,
  initialUserEmail,
}: HeroProps) {
  const isResolvedSignedIn = initialSignedIn;
  const createEbookHref = buildAuthHref("sign-in", "/dashboard") as Route;
  const workspaceHref = "/dashboard" as Route;
  const pricingHref = "/pricing" as Route;

  return (
    <div className="editorial-landing-page">
      {/* Background grain */}
      <div className="grain-overlay"></div>

      <MarketingHeader
        initialSignedIn={initialSignedIn}
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
      />

      <main>
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
                {" "}
                <span>into beautiful ebooks.</span>
              </h1>
              <p className="font-geist">
                Bring notes, research, or source material. Celion turns it into editable ebook pages you can refine, export, and share.
              </p>
              <div className="hero-actions fade-up">
                {isResolvedSignedIn ? (
                  <Link href={workspaceHref} className="btn btn-dark hero-cta-primary">
                    Go to workspace
                  </Link>
                ) : (
                  <Link href={createEbookHref} prefetch={false} className="btn btn-dark hero-cta-primary">
                    Start creating
                  </Link>
                )}
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
                        <span>Source notes</span>
                        <span>3 inputs</span>
                      </div>
                      <div className="studio-source-note">
                        <span></span>
                        <p>Reader needs a practical system.</p>
                      </div>
                      <div className="studio-source-note">
                        <span></span>
                        <p>Use diagnosis, rhythm, review.</p>
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
                          Celion turns rough material into editable pages with a clear reader promise.
                        </p>
                      </div>
                      <div className="studio-page-grid">
                        <div>
                          <span>01</span>
                          <strong>Source</strong>
                          <p>Notes and research.</p>
                        </div>
                        <div>
                          <span>02</span>
                          <strong>Pages</strong>
                          <p>Editable layouts.</p>
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

        <section id="outputs" className="section output-section">
          <div className="container">
            <div className="section-head output-head fade-up">
              <h2 className="section-h">Create ebooks people can actually open.</h2>
              <p className="section-aside">
                Turn rough material into polished, editable pages for guides, workbooks, reports, and lead magnets.
              </p>
            </div>

            <div className="output-gallery">
              <article className="output-card output-card-guide fade-up">
                <div className="output-card-meta">
                  <span>Guide</span>
                  <span>14 pages</span>
                </div>
                <div className="output-cover">
                  <div className="output-cover-kicker">Creator guide</div>
                  <h3>Idea to Ebook</h3>
                  <div className="output-cover-line"></div>
                  <div className="output-cover-grid"></div>
                </div>
              </article>

              <article className="output-card output-card-workbook fade-up">
                <div className="output-card-meta">
                  <span>Workbook</span>
                  <span>18 pages</span>
                </div>
                <div className="output-cover">
                  <div className="output-cover-kicker">Field notes</div>
                  <h3>Launch Workbook</h3>
                  <div className="output-cover-rule"></div>
                  <div className="output-cover-list">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </article>

              <article className="output-card output-card-report fade-up">
                <div className="output-card-meta">
                  <span>Report</span>
                  <span>10 pages</span>
                </div>
                <div className="output-cover">
                  <div className="output-cover-kicker">Research brief</div>
                  <h3>Market Signals</h3>
                  <div className="output-cover-chart">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </article>

              <article className="output-card output-card-playbook fade-up">
                <div className="output-card-meta">
                  <span>Playbook</span>
                  <span>22 pages</span>
                </div>
                <div className="output-cover">
                  <div className="output-cover-kicker">Operating system</div>
                  <h3>Creator Playbook</h3>
                  <div className="output-cover-stack">
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section workflow-section">
          <div className="container">
            <div className="section-head fade-up">
              <h2 className="section-h">From source to shareable ebook.</h2>
              <p className="section-aside">
                Celion keeps the work moving in three simple stages: bring the material, shape the plan, then finish the pages.
              </p>
            </div>

            <div className="workflow-row">
              <div className="workflow-step fade-up">
                <span>01</span>
                <h3>Bring source</h3>
                <p>Start with notes, research, transcripts, or a rough outline.</p>
              </div>
              <div className="workflow-step fade-up">
                <span>02</span>
                <h3>Shape the plan</h3>
                <p>Turn the raw material into a focused page structure before generation.</p>
              </div>
              <div className="workflow-step fade-up">
                <span>03</span>
                <h3>Edit and export</h3>
                <p>Polish the generated pages, then export the finished ebook when it is ready.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="preview" className="section editor-proof-section">
          <div className="container">
            <div className="preview-band">
              <div className="preview-features fade-up">
                <h3 className="section-h">Not just generated text. Editable ebook pages.</h3>
                <div className="preview-points">
                  <div className="preview-point">
                    <strong>Plan-led generation</strong>
                    <span>The ebook is shaped around the reader, the promise, and the source material before pages are written.</span>
                  </div>
                  <div className="preview-point">
                    <strong>Editable page structure</strong>
                    <span>The draft arrives as compact pages you can revise, reorder, and export instead of rebuilding from a wall of text.</span>
                  </div>
                </div>
              </div>

              <div className="editor-proof-mockup fade-up" aria-hidden="true">
                <div className="editor-proof-window">
                  <div className="editor-proof-top">
                    <span>Page 04</span>
                    <span>Editable draft</span>
                  </div>
                  <div className="editor-proof-body">
                    <aside className="editor-proof-rail">
                      <span></span>
                      <span></span>
                      <span data-active="true"></span>
                      <span></span>
                    </aside>
                    <div className="editor-proof-page">
                      <div className="editor-proof-kicker">Chapter 01</div>
                      <h4>The Reader Promise</h4>
                      <p>A useful ebook does more than summarize. It gives the reader a clear way to understand, decide, or act.</p>
                      <div className="editor-proof-highlight">Selected text remains editable after generation.</div>
                      <div className="editor-proof-lines">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <aside className="editor-proof-inspector">
                      <div></div>
                      <span></span>
                      <span></span>
                      <span></span>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="export" className="section fade-up">
          <div className="container">
            <div className="cta-band">
              <div className="cta-copy">
                <h3>Start with one idea.</h3>
                <p>Turn it into an editable ebook draft.</p>
              </div>
              <div className="cta-buttons">
                {isResolvedSignedIn ? (
                  <Link href={workspaceHref} className="btn btn-dark">Go to workspace</Link>
                ) : (
                  <Link href={createEbookHref} prefetch={false} className="btn btn-dark">Start creating</Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
