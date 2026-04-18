import Link from "next/link";
import { ArrowRight, FileStack, Sparkles, Wand2 } from "lucide-react";

const proofPoints = [
  "Source-first intake for real expert material",
  "Preview-first builder with HTML output",
  "AI revision path before visual polish",
];

export function Hero() {
  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between py-4">
          <p className="text-sm font-semibold tracking-tight text-text">Celion</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-text transition hover:border-accent hover:text-accent"
          >
            Open dashboard
            <ArrowRight className="size-4" />
          </Link>
        </header>

        <section className="grid gap-12 pt-16 pb-20 md:grid-cols-[1.15fr_0.85fr] md:pt-24 md:pb-28">
          <div className="flex flex-col justify-between gap-10">
            <div className="space-y-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                Build a sellable guide from your own material
              </p>
              <h1 className="max-w-4xl font-display text-5xl leading-[1.05] tracking-[-0.01em] md:text-7xl">
                Bring the notes. Leave with a finished HTML guide.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted md:text-lg">
                Celion is not a blank-page writing tool. Drop in your own
                drafts, research, transcripts, PDFs, and working notes. Shape
                the tone. Lock the reader level. Then push the result into a
                preview-first builder that is already structured for revision,
                export, and Figma handoff.
              </p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Start a guide
                <ArrowRight className="size-4" />
              </Link>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Landing page, dashboard, wizard, builder. Nothing extra.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-rows-[1.25fr_0.75fr]">
            <article className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-float">
              <div className="absolute right-0 top-0 size-44 rounded-full bg-accentSoft blur-3xl" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                    Preview-first flow
                  </p>
                  <div className="rounded-full border border-line bg-surface-subtle px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    v1
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-line bg-[#1b1a16] p-5 text-white">
                    <div className="mb-4 flex items-center gap-3">
                      <Sparkles className="size-4 text-accent" />
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">
                        Wizard intake
                      </p>
                    </div>
                    <p className="max-w-sm font-display text-3xl leading-tight tracking-[-0.01em]">
                      Combine multiple sources. Pick the exact reading mode.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-accentSoft p-5">
                      <FileStack className="mb-6 size-5 text-text" />
                      <p className="font-display text-2xl leading-tight tracking-[-0.01em]">
                        HTML output with section markers
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface p-5">
                      <Wand2 className="mb-6 size-5 text-text" />
                      <p className="font-display text-2xl leading-tight tracking-[-0.01em]">
                        Revise with AI before sending to Figma
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-line bg-surface p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                Product frame
              </p>
              <div className="mt-6 space-y-3">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-xl border border-line bg-surface-subtle px-4 py-3.5 text-sm leading-7 text-text"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
