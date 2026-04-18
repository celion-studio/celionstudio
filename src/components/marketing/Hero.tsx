import Link from "next/link";
import { ArrowRight, FileText, Sparkles, Wand2, FileStack } from "lucide-react";

export function Hero() {
  return (
    <main className="relative min-h-screen bg-[#FAF9F5]">

      {/* ── Pill Nav ───────────────────────────────────────── */}
      <nav className="absolute inset-x-0 top-0 z-30 flex justify-center px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="w-full max-w-[760px]">
          <div className="flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white pl-3 pr-1.5 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1F1F1F]">
                <span className="font-mono text-[10px] font-bold text-white">C</span>
              </div>
              <span className="text-[14px] font-semibold tracking-tight text-[#1F1F1F]">Celion</span>
            </div>

            {/* Desktop links */}
            <div className="hidden items-center md:flex">
              {["How it works", "Pricing", "Docs"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="px-3.5 py-2 text-[13px] font-medium text-[#71717a] transition hover:text-[#1F1F1F]"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/dashboard"
              className="rounded-xl border border-black/[0.08] bg-[#FAF9F5] px-4 py-2 text-[13px] font-semibold text-[#1F1F1F] transition hover:bg-[#F0EDE6]"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero copy ──────────────────────────────────────── */}
      <section className="relative px-6 pb-[130px] pt-28 sm:pb-[160px] sm:pt-32 lg:pb-[200px]">
        <div className="mx-auto max-w-[900px] text-center">

          {/* Label */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C4622D]" />
            <span className="text-[11px] font-medium tracking-[0.12em] text-[#71717a] uppercase">
              Guide creation · HTML export
            </span>
          </div>

          {/* Headline — Geist, tight */}
          <h1 className="mx-auto mb-6 max-w-[720px] text-[clamp(38px,5vw,60px)] font-bold leading-[1.1] tracking-[-0.03em] text-[#1F1F1F]">
            Bring the notes.<br />Leave with a finished guide.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-9 max-w-[500px] text-[16px] leading-[1.75] tracking-[-0.01em] text-[#71717a]">
            Drop in your drafts, transcripts, and research. Shape the tone, lock the reader level, and get a structured HTML guide ready to export.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1F1F1F] px-6 py-3.5 text-[14px] font-semibold text-white transition hover:opacity-80"
            >
              Start a guide
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-6 py-3.5 text-[14px] font-semibold text-[#1F1F1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#FAF9F5]"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-[12px] text-[#a1a1aa]">
            No account needed · Stored locally
          </p>
        </div>
      </section>

      {/* ── Visual band + Builder mockup overlap ───────────── */}
      <section className="relative">
        {/* Dark band */}
        <div className="h-[380px] w-full bg-[#1F1F1F] sm:h-[480px] lg:h-[560px]" />

        {/* Builder mockup — overlaps white hero */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -translate-y-[80px] px-4 sm:-translate-y-[110px] sm:px-6 lg:-translate-y-[150px]">
          <div className="pointer-events-auto mx-auto max-w-[980px]">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_48px_120px_-24px_rgba(0,0,0,0.5),0_24px_60px_-12px_rgba(0,0,0,0.3)]">

              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#161616] px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="ml-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Builder</p>
                    <p className="text-[15px] font-semibold leading-tight text-white/90">Instagram Growth Playbook</p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/40">Dashboard</div>
              </div>

              {/* 3-panel body */}
              <div className="grid grid-cols-[200px_1fr_240px] bg-[#FAF9F5]" style={{ minHeight: 340 }}>

                {/* Left — Source panel */}
                <div className="flex flex-col gap-3 border-r border-[#E8E4DB] bg-[#F4F2EC] p-4">
                  <div className="rounded-xl border border-[#E8E4DB] bg-white p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Status</p>
                    <p className="mt-1.5 text-base font-semibold text-[#1F1F1F]">draft</p>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DB] bg-white p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Guide profile</p>
                    <dl className="mt-2 space-y-2">
                      <div>
                        <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7A7670]">Audience</dt>
                        <dd className="mt-0.5 text-[11px] text-[#1F1F1F]">Creators, marketers</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7A7670]">Tone</dt>
                        <dd className="mt-0.5 text-[11px] text-[#1F1F1F]">Practical</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DB] bg-white p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Sources</p>
                    <div className="mt-2 space-y-1.5">
                      {["notes.md", "transcript.txt"].map((f) => (
                        <div key={f} className="flex items-center gap-1.5 rounded-lg border border-[#E8E4DB] bg-[#F4F2EC] px-2.5 py-1.5">
                          <FileText className="size-3 text-[#7A7670]" />
                          <span className="font-mono text-[9px] text-[#1F1F1F]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center — Preview */}
                <div className="flex flex-col border-r border-[#E8E4DB] bg-white">
                  <div className="flex items-center justify-between border-b border-[#E8E4DB] px-4 py-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Live preview</p>
                      <p className="text-[15px] font-semibold text-[#1F1F1F]">Instagram Growth Playbook</p>
                    </div>
                    <div className="rounded-full border border-[#E8E4DB] bg-[#F4F2EC] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7A7670]">HTML</div>
                  </div>
                  <div className="flex-1 px-6 py-5">
                    <div className="space-y-2.5">
                      <div className="h-5 w-2/3 rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-full rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-5/6 rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-4/5 rounded-md bg-[#F4F2EC]" />
                      <div className="mt-4 h-4 w-1/2 rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-full rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-3/4 rounded-md bg-[#F4F2EC]" />
                      <div className="mt-4 rounded-xl border border-[#E8E4DB] bg-[#FBF0E8] p-3">
                        <div className="h-2.5 w-1/2 rounded-md bg-[#C4622D]/25" />
                        <div className="mt-2 h-2.5 w-full rounded-md bg-[#C4622D]/12" />
                        <div className="mt-1.5 h-2.5 w-4/5 rounded-md bg-[#C4622D]/12" />
                      </div>
                      <div className="h-2.5 w-full rounded-md bg-[#F4F2EC]" />
                      <div className="h-2.5 w-2/3 rounded-md bg-[#F4F2EC]" />
                    </div>
                  </div>
                </div>

                {/* Right — Actions */}
                <div className="flex flex-col gap-3 bg-white p-4">
                  <div className="rounded-xl border border-[#E8E4DB] bg-[#F4F2EC] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">AI actions</p>
                    <div className="mt-2.5 grid gap-2">
                      <div className="flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-3 py-2">
                        <Sparkles className="size-3 text-white/80" />
                        <span className="text-[11px] font-semibold text-white">Generate first draft</span>
                      </div>
                      <div className="rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[11px] text-[#7A7670]">
                        Regenerate full draft
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DB] bg-white p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Revision prompt</p>
                    <div className="mt-2 rounded-lg border border-[#E8E4DB] bg-[#F4F2EC] px-3 py-2 text-[10px] text-[#a1a1aa]">
                      Make the intro sharper...
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DB] bg-white p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7A7670]">Output</p>
                    <div className="mt-2.5 grid gap-1.5">
                      <div className="flex items-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2">
                        <FileStack className="size-3 text-[#7A7670]" />
                        <span className="text-[10px] font-medium text-[#1F1F1F]">Export PDF</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2">
                        <Wand2 className="size-3 text-[#7A7670]" />
                        <span className="text-[10px] font-medium text-[#1F1F1F]">Copy HTML for Figma</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
