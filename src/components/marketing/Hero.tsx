'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthModal } from '@/components/auth/AuthModal';
import { authClient } from '@/lib/auth-client';

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
  const [showAuth, setShowAuth] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const liveSignedIn = Boolean(session?.user);
  const isResolvedSignedIn = hydrated
    ? (isPending ? initialSignedIn : liveSignedIn)
    : initialSignedIn;
  const displayUserName =
    hydrated && !isPending ? session?.user?.name ?? null : initialUserName;
  const displayUserEmail =
    hydrated && !isPending ? session?.user?.email ?? null : initialUserEmail;
  const userInitial =
    displayUserName?.charAt(0).toUpperCase() ??
    displayUserEmail?.charAt(0).toUpperCase() ??
    "U";

  // Handle Neon Auth redirect if it lands on the homepage
  useEffect(() => {
    setHydrated(true);

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("neon_auth_session_verifier")) return;

    let active = true;
    async function finalizeSignIn() {
      try {
        const result = await authClient.getSession();
        if (!result?.error && active) {
          window.location.replace("/dashboard");
        }
      } catch (err) {
        console.error("Session verification failed", err);
      }
    }
    
    finalizeSignIn();
    return () => { active = false; };
  }, []);

  // Carousel orbit animation
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll(".carousel-item")) as HTMLElement[];
    if (cards.length === 0) return;

    const speed = 0.08; 
    let start = performance.now();
    let animationFrameId: number;

    function render(now: number) {
      const time = (now - start) / 1000;
      const radius = window.innerWidth > 900 ? 800 : 500; 

      cards.forEach((card, index) => {
        let progress = ((time * speed) + (index / cards.length)) % 1.0;
        const angle = -Math.PI / 3 + progress * (Math.PI * 2 / 3);
        const x = Math.sin(angle) * (radius * 1.5);
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

      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <svg className="brand-spark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32"/>
            </svg>
            <span>celion</span>
          </div>
          <div className="nav-actions">
            {isResolvedSignedIn ? (
              <>
                <Link href="/dashboard" className="nav-link bg-transparent border-none cursor-pointer" style={{ textDecorationLine: 'none' }}>Dashboard</Link>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#333] text-[11px] text-white">
                  {userInitial}
                </div>
              </>
            ) : (
              <>
                <button className="nav-link bg-transparent border-none cursor-pointer" onClick={() => setShowAuth(true)}>Log in</button>
                <button className="btn btn-light" onClick={() => setShowAuth(true)}>Get started</button>
              </>
            )}
          </div>
        </div>
      </nav>

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
                Celion is domain-specific AI for brand teams, agencies, and publishers.
              </p>
            </div>

            <div className="hero-carousel-stage" id="bookCarousel" ref={stageRef}>
              <div className="hero-btn-center">
                {isResolvedSignedIn ? (
                  <Link href="/dashboard" className="btn btn-dark" style={{ padding: '0 24px', textDecorationLine: 'none', minHeight: '48px', borderRadius: 'var(--radius-sm)', fontSize: '15px', boxShadow: '0 10px 24px rgba(0,0,0,0.2)', display: 'inline-flex', alignItems: 'center' }}>
                    Go to workspace
                  </Link>
                ) : (
                  <button className="btn btn-dark" onClick={() => setShowAuth(true)} style={{ padding: '0 24px', minHeight: '48px', borderRadius: 'var(--radius-sm)', fontSize: '15px', boxShadow: '0 10px 24px rgba(0,0,0,0.2)' }}>
                    Start a draft
                  </button>
                )}
              </div>

              <article className="carousel-item">
                 <div className="cover cover-1">
                    <div className="cover-title">Operator<br/>Essays</div>
                    <div className="cover-sub">Notes from the field</div>
                 </div>
              </article>
              
              <article className="carousel-item">
                 <div className="cover cover-2">
                    <div className="cover-title" style={{ letterSpacing: '-0.05em', fontSize: '32px' }}>AESTHETIC<br/>FORM</div>
                    <div className="cover-sub" style={{ opacity: 1 }}>VOL. 01</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-3">
                    <div className="cover-sub" style={{ marginTop: 0, marginBottom: 'auto' }}>Manual</div>
                    <div className="cover-title">Release<br/>Notes 2.0</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-4">
                    <div className="cover-sub" style={{ marginTop: 0, marginBottom: '20px' }}>04</div>
                    <div className="cover-title" style={{ fontSize: '40px' }}>Taste</div>
                 </div>
              </article>

              <article className="carousel-item">
                 <div className="cover cover-5">
                    <div className="cover-title" style={{ marginTop: '40px' }}>Deep<br/>Learning</div>
                    <div className="cover-sub">Systems</div>
                 </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head fade-up">
              <div className="section-kicker">How it works</div>
              <h2 className="section-h">From source to shelf without the usual mess.</h2>
              <p className="section-aside">No rigid template galleries. Celion analyzes the tone and audience you set, building an opinionated draft directly from your rough materials.</p>
            </div>

            <div className="process-grid">
              <div className="process-card fade-up">
                <div className="process-num-bg">01</div>
                <div className="process-content">
                  <h3 className="process-title">Bring your material</h3>
                  <p className="process-body">Paste a doc, drop a transcript, upload markdown. Celion doesn't care where the knowledge lives.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">02</div>
                <div className="process-content">
                  <h3 className="process-title">AI drafts the shape</h3>
                  <p className="process-body">Tell it who's reading. Celion picks structure, pacing, and opens a first draft with your voice at the helm.</p>
                </div>
                <div className="process-visual"></div>
              </div>
              <div className="process-card fade-up">
                <div className="process-num-bg">03</div>
                <div className="process-content">
                  <h3 className="process-title">Revise and ship</h3>
                  <p className="process-body">Argue with paragraphs, not outlines. Open the print flow and save a PDF when it's ready to read.</p>
                </div>
                <div className="process-visual"></div>
              </div>
            </div>

            <div className="preview-band">
              <div className="preview-features fade-up">
                <div className="section-kicker">The editor</div>
                <h3 className="section-h">An AI with taste, not just output.</h3>
                <div className="preview-points">
                  <div className="preview-point">
                    <strong>Opinionated structure, not blank-page wizardry</strong>
                    <span>Celion reads your brief and argues with your draft the way a good editor would. It asks what to cut, what to keep, and which voice the reader signed up for.</span>
                  </div>
                  <div className="preview-point">
                    <strong>Voice-matched prose from your source material</strong>
                    <span>The models are tuned to emulate your phrasing, preventing the generic AI tone.</span>
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

        <section className="section fade-up">
          <div className="container">
            <div className="cta-band">
              <div className="cta-copy">
                <div className="section-kicker">Start here</div>
                <h3>Start with the draft you already have.</h3>
                <p>Notes in, structure out, then print to PDF when it reads like a real book.</p>
              </div>
              <div className="cta-buttons">
                {isResolvedSignedIn ? (
                  <Link href="/dashboard" className="btn btn-dark" style={{ textDecorationLine: 'none' }}>Go to workspace</Link>
                ) : (
                  <button className="btn btn-dark" onClick={() => setShowAuth(true)}>Start a draft</button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid fade-up">
            <div className="footer-brand">
              <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f6f7f8', fontFamily: 'Geist', fontSize: '14px', fontWeight: 500 }}>
                <svg className="brand-spark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32"/>
                </svg>
                <span>celion</span>
              </div>
              <p>Publishing software for founders, agencies, and operators turning raw notes into finished ebooks.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <Link href="#">How it works</Link>
              <Link href="#">Preview</Link>
              <Link href="#">Print PDF</Link>
              <Link href="#">Pricing</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link href="#">About</Link>
              <Link href="#">Changelog</Link>
              <Link href="#">Contact</Link>
              <Link href="#">Careers</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <Link href="#">Help center</Link>
              <Link href="#">Writing project</Link>
              <Link href="#">Privacy</Link>
              <Link href="#">Terms</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>Celion 2026. All rights reserved.</span>
            <span>Designed for clear drafts and better books.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
