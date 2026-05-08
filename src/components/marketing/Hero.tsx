'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthModal } from '@/components/auth/use-auth-modal';
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
  const { authModal, openAuthModal } = useAuthModal();
  const isResolvedSignedIn = initialSignedIn;

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
        onStartDraft={openAuthModal}
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
              <h1 className="font-geist">Your publishing OS.</h1>
              <p className="font-geist">
                Build an editable brief from your sources, generate an A5 ebook draft, then carry it into the editor for final publication.
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
                    <button className="btn btn-dark hero-cta-primary" onClick={openAuthModal}>
                      Start a draft
                    </button>
                  )}
                  <a className="btn btn-light hero-cta-secondary" href="mailto:hello@celion.studio">
                    Book a demo
                  </a>
                </div>
              </div>

              <article className="carousel-item">
                 <div className="cover cover-1">
                    <div className="cover-kicker">Operator series</div>
                    <div className="cover-title">Operator<br/>Essays</div>
                    <div className="cover-rules"><span></span><span></span><span></span></div>
                    <div className="cover-sub">Notes from the field</div>
                 </div>
              </article>
              
              <article className="carousel-item">
                 <div className="cover cover-2">
                    <div className="cover-kicker">Design memo</div>
                    <div className="cover-title">Aesthetic<br/>Form</div>
                    <div className="cover-frame"></div>
                    <div className="cover-sub">VOL. 01</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-3">
                    <div className="cover-kicker">Manual</div>
                    <div className="cover-title">Release<br/>Notes 2.0</div>
                    <div className="cover-diagram"><span></span><span></span><span></span><span></span></div>
                    <div className="cover-sub">Celion studio</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-4">
                    <div className="cover-kicker">04</div>
                    <div className="cover-title cover-title-large">Taste</div>
                    <div className="cover-index"><span>Judgment</span><span>Structure</span><span>Signal</span></div>
                    <div className="cover-sub">Private draft</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-5">
                    <div className="cover-kicker">Systems</div>
                    <div className="cover-title">Deep<br/>Learning</div>
                    <div className="cover-rules cover-rules-tight"><span></span><span></span><span></span><span></span></div>
                    <div className="cover-sub">Working paper</div>
                 </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section">
          <div className="container">
            <div className="section-head fade-up">
              <div className="section-kicker">How it works</div>
              <h2 className="section-h">From brief to A5 publication without the usual mess.</h2>
              <p className="section-aside">Celion starts by shaping a usable brief, reads the sources you provide, and turns them into an editable publication draft instead of a loose AI outline.</p>
            </div>

            <div className="process-grid">
              <div className="process-card fade-up">
                <div className="process-num-bg">01</div>
                <div className="process-content">
                  <h3 className="process-title">Start with a brief</h3>
                  <p className="process-body">Set the reader, purpose, tone, and source context before generation begins, so the draft has an editorial point of view.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">02</div>
                <div className="process-content">
                  <h3 className="process-title">Generate from sources</h3>
                  <p className="process-body">Paste notes, transcripts, or research. Celion organizes the material into a source-led A5 ebook draft with structure and pacing already in place.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">03</div>
                <div className="process-content">
                  <h3 className="process-title">Edit into publication</h3>
                  <p className="process-body">Move into the editor to refine pages, revise passages, and export the finished draft when it reads like a real book.</p>
                </div>
                <div className="process-visual"></div>
              </div>
            </div>

            <div id="preview" className="preview-band">
              <div className="preview-features fade-up">
                <div className="section-kicker">The editor</div>
                <h3 className="section-h">A draft that arrives with a brief behind it.</h3>
                <div className="preview-points">
                  <div className="preview-point">
                    <strong>Brief-first structure, not blank-page wizardry</strong>
                    <span>Celion uses the approved brief to decide what to keep, what to cut, and how the publication should unfold for the reader.</span>
                  </div>
                  <div className="preview-point">
                    <strong>Source-led prose for A5 pages</strong>
                    <span>The draft is grounded in your material and formatted for a compact publication workflow, ready for human revision in the editor.</span>
                  </div>
                </div>
              </div>

              <div className="preview-doc fade-up">
                <div className="layered-paper paper-back"></div>
                <div className="layered-paper paper-front">
                  <h4 style={{ margin:0, fontFamily:'Geist', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-soft)' }}>Chapter 01</h4>
                  <h2 style={{ margin:'24px 0 16px', fontFamily:'Geist', fontSize:'32px', fontWeight:400, lineHeight:1.1 }}>Aesthetic Form</h2>
                  <p style={{ color:'var(--ink)', fontSize:'16px', lineHeight:1.6, maxWidth: '90%' }}>The ultimate goal of publishing is not just to distribute text, but to frame ideas inside a medium that demands respect.</p>
                  <div style={{ marginTop:'32px', display:'grid', gap:'12px' }}>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'4px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'4px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'4px', width:'70%' }}></div>
                  </div>
                  <div style={{ marginTop:'24px', display:'grid', gap:'12px' }}>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'4px', width:'100%' }}></div>
                    <div style={{ height:'8px', background:'var(--line-soft)', borderRadius:'4px', width:'40%' }}></div>
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
                <h3>Start with the brief, not a blank page.</h3>
                <p>Bring the sources, shape the intent, then generate an editable ebook draft for the Celion editor.</p>
              </div>
              <div className="cta-buttons">
                {isResolvedSignedIn ? (
                  <Link href="/dashboard" className="btn btn-dark" style={{ textDecorationLine: 'none' }}>Go to workspace</Link>
                ) : (
                  <button className="btn btn-dark" onClick={openAuthModal}>Start a draft</button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {authModal}

      <MarketingFooter />
    </div>
  );
}
