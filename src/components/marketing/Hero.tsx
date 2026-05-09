'use client';

import type { Route } from 'next';
import { useEffect, useRef } from 'react';
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
  const stageRef = useRef<HTMLDivElement>(null);
  const isResolvedSignedIn = initialSignedIn;
  const createEbookHref = buildAuthHref("sign-up", "/dashboard") as Route;

  // Carousel orbit animation
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll(".carousel-item")) as HTMLElement[];
    if (cards.length === 0) return;

    const speed = 0.08;
    const start = performance.now();
    let animationFrameId: number;

    function render(now: number) {
      const time = (now - start) / 1000;
      const radius = window.innerWidth > 900 ? 560 : 380;

      cards.forEach((card, index) => {
        const progress = ((time * speed) + (index / cards.length)) % 1.0;
        const angle = -Math.PI / 3 + progress * (Math.PI * 2 / 3);
        const x = Math.sin(angle) * (radius * 1.2);
        const y = radius - Math.cos(angle) * radius;

        let opacity = 1;
        if (progress < 0.1) opacity = progress / 0.1;
        else if (progress > 0.9) opacity = (1 - progress) / 0.1;

        const tilt = angle * (180 / Math.PI);

        card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = "10";
      });

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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
                <span>Turn your ideas into</span>
                <span>beautiful ebooks.</span>
              </h1>
              <p className="font-geist">
                Bring a rough thought, source file, or saved note. Celion shapes it into a polished ebook draft you can edit, refine, and share.
              </p>
            </div>

            <div className="hero-carousel-stage" id="bookCarousel" ref={stageRef}>
              <div className="hero-btn-center">
                <div className="hero-cta-cluster">
                  {isResolvedSignedIn ? (
                    <Link href="/dashboard" className="btn btn-dark hero-cta-primary" style={{ textDecorationLine: 'none' }}>
                      Go to workspace
                    </Link>
                  ) : (
                    <Link href={createEbookHref} className="btn btn-dark hero-cta-primary" style={{ textDecorationLine: 'none' }}>
                      Create an ebook
                    </Link>
                  )}
                  <a className="btn btn-light hero-cta-secondary" href="mailto:hello@celion.studio">
                    Book a demo
                  </a>
                </div>
              </div>

              <article className="carousel-item">
                 <div className="cover cover-1">
                    <div className="cover-kicker">Founder guide</div>
                    <div className="cover-title">Market<br/>Memo</div>
                    <div className="cover-rules"><span></span><span></span><span></span></div>
                    <div className="cover-sub">From notes to guide</div>
                 </div>
              </article>
              
              <article className="carousel-item">
                 <div className="cover cover-2">
                    <div className="cover-kicker">Course asset</div>
                    <div className="cover-title">Lesson<br/>Pack</div>
                    <div className="cover-frame"></div>
                    <div className="cover-sub">VOL. 01</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-3">
                    <div className="cover-kicker">Client manual</div>
                    <div className="cover-title">Launch<br/>Playbook</div>
                    <div className="cover-diagram"><span></span><span></span><span></span><span></span></div>
                    <div className="cover-sub">Ready to edit</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-4">
                    <div className="cover-kicker">04</div>
                    <div className="cover-title cover-title-large">Offer</div>
                    <div className="cover-index"><span>Problem</span><span>Proof</span><span>Next step</span></div>
                    <div className="cover-sub">Lead asset draft</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-5">
                    <div className="cover-kicker">Research brief</div>
                    <div className="cover-title">Expert<br/>Guide</div>
                    <div className="cover-rules cover-rules-tight"><span></span><span></span><span></span><span></span></div>
                    <div className="cover-sub">Source-led pages</div>
                 </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section">
          <div className="container">
            <div className="section-head fade-up">
              <div className="section-kicker">How it works</div>
              <h2 className="section-h">A guided path from raw material to finished pages.</h2>
              <p className="section-aside">Celion keeps generation grounded in your sources, then gives you a structured ebook draft instead of a blank document or a loose chatbot answer.</p>
            </div>

            <div className="process-grid">
              <div className="process-card fade-up">
                <div className="process-num-bg">01</div>
                <div className="process-content">
                  <h3 className="process-title">Define the reader</h3>
                  <p className="process-body">Set the audience, goal, tone, and source context before generation starts, so the ebook has a clear job to do.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">02</div>
                <div className="process-content">
                  <h3 className="process-title">Plan from the source</h3>
                  <p className="process-body">Upload or paste your material. Celion turns the useful parts into a page plan before writing the ebook.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">03</div>
                <div className="process-content">
                  <h3 className="process-title">Edit the actual pages</h3>
                  <p className="process-body">Review the generated A5 pages, revise the text, adjust details, and export when the piece is ready to share.</p>
                </div>
                <div className="process-visual"></div>
              </div>
            </div>

            <div id="preview" className="preview-band">
              <div className="preview-features fade-up">
                <div className="section-kicker">The editor</div>
                <h3 className="section-h">Not just generated text. A document you can finish.</h3>
                <div className="preview-points">
                  <div className="preview-point">
                    <strong>Structured before it writes</strong>
                    <span>The plan keeps the ebook focused on the reader, the promise, and the source material that supports it.</span>
                  </div>
                  <div className="preview-point">
                    <strong>Designed as editable pages</strong>
                    <span>The output is organized into compact A5 pages, so you can polish the piece instead of rebuilding it from a wall of text.</span>
                  </div>
                </div>
              </div>

              <div className="preview-doc fade-up">
                <div className="layered-paper paper-back"></div>
                <div className="layered-paper paper-front">
                  <h4 style={{ margin:0, fontFamily:'Geist', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-soft)' }}>Chapter 01</h4>
                  <h2 style={{ margin:'24px 0 16px', fontFamily:'Geist', fontSize:'32px', fontWeight:400, lineHeight:1.1 }}>The Reader Promise</h2>
                  <p style={{ color:'var(--ink)', fontSize:'16px', lineHeight:1.6, maxWidth: '90%' }}>A useful ebook does more than summarize. It gives the reader a clear way to understand, decide, or act.</p>
                  <div style={{ marginTop:'32px', display:'grid', gap:'12px' }}>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'6px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'6px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'6px', width:'70%' }}></div>
                  </div>
                  <div style={{ marginTop:'24px', display:'grid', gap:'12px' }}>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'6px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'6px', width:'40%' }}></div>
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
                <div className="section-kicker">Start here</div>
                <h3>Create the ebook version of what you already know.</h3>
                <p>Bring the source material. Celion will shape the plan, draft the pages, and keep the result editable.</p>
              </div>
              <div className="cta-buttons">
                {isResolvedSignedIn ? (
                  <Link href="/dashboard" className="btn btn-dark" style={{ textDecorationLine: 'none' }}>Go to workspace</Link>
                ) : (
                  <Link href={createEbookHref} className="btn btn-dark" style={{ textDecorationLine: 'none' }}>Create an ebook</Link>
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
