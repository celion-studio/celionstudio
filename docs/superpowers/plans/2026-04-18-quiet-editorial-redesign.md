# Quiet Editorial Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Celion's warm lime/orange aesthetic with a "Quiet Editorial" look — #FAF9F5 background, #1F1F1F text, terracotta amber accent (#C4622D), Instrument Serif display font, Geist Sans body.

**Architecture:** Pure visual refactor — no logic changes. Update CSS custom properties first (globals.css + tailwind.config.ts + layout.tsx), then apply new classNames page by page. Each task is self-contained and commits its own changes.

**Tech Stack:** Next.js 15, Tailwind CSS 3, next/font/google (Instrument_Serif, Geist), TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/styles/globals.css` | New color tokens, flat background, accent selection color |
| `src/app/layout.tsx` | Swap Fraunces→Instrument_Serif, Public_Sans→Geist |
| `tailwind.config.ts` | Add `surface-subtle` token, remove `mesh` bg, update shadow |
| `src/components/marketing/Hero.tsx` | Full landing page restyle |
| `src/components/dashboard/DashboardShell.tsx` | Remove wrapper card, flat layout |
| `src/components/dashboard/GuideList.tsx` | Update card + empty state styles |
| `src/components/dashboard/NewGuideButton.tsx` | Accent color button |
| `src/components/builder/BuilderShell.tsx` | Thin top bar, update not-found state |
| `src/components/builder/SourcePanel.tsx` | surface-subtle background, rounded-2xl |
| `src/components/builder/PreviewPanel.tsx` | White bg, remove warm tint |
| `src/components/builder/ActionPanel.tsx` | Accent primary button, ghost secondaries |
| `src/components/builder/EmptyBuilderState.tsx` | Flat empty state |
| `src/components/wizard/GuideWizard.tsx` | White modal, lighter overlay, accent steps |
| `src/components/wizard/SourceStep.tsx` | rounded-2xl, surface-subtle inputs |
| `src/components/wizard/ProfileStep.tsx` | rounded-2xl, surface-subtle inputs |
| `src/components/wizard/StyleStep.tsx` | Accent active pill, rounded-2xl |

---

## Task 1: Update CSS variables and global styles

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Replace globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #faf9f5;
  --color-surface: #ffffff;
  --color-surface-subtle: #f4f2ec;
  --color-muted: #7a7670;
  --color-text: #1f1f1f;
  --color-accent: #c4622d;
  --color-accent-soft: #fbf0e8;
  --color-line: #e8e4db;
  --font-display: "Instrument Serif", serif;
  --font-body: "Geist", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: var(--color-bg);
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--color-text);
  font-family: var(--font-body);
  background: var(--color-bg);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

::selection {
  background: rgba(196, 98, 45, 0.2);
  color: #1f1f1f;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "design: update CSS variables to quiet editorial palette"
```

---

## Task 2: Swap fonts in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata } from "next";
import { Instrument_Serif, Geist, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Geist({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Celion",
  description: "Turn your notes and expertise into a polished HTML guide.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} bg-bg text-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd c:/Users/dasar/Desktop/celion && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "design: swap fonts to Instrument Serif + Geist"
```

---

## Task 3: Update Tailwind config

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-subtle": "var(--color-surface-subtle)",
        muted: "var(--color-muted)",
        text: "var(--color-text)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        line: "var(--color-line)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        float: "0 4px 24px rgba(31, 31, 31, 0.08)",
      },
      borderRadius: {
        panel: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "design: update tailwind tokens — remove mesh gradient, add surface-subtle"
```

---

## Task 4: Restyle Hero (landing page)

**Files:**
- Modify: `src/components/marketing/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketing/Hero.tsx
git commit -m "design: restyle landing Hero — flat layout, accent CTA, Instrument Serif h1"
```

---

## Task 5: Restyle Dashboard

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Modify: `src/components/dashboard/GuideList.tsx`
- Modify: `src/components/dashboard/NewGuideButton.tsx`

- [ ] **Step 1: Replace DashboardShell.tsx**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getGuides } from "@/lib/guide-storage";
import type { GuideRecord } from "@/types/guide";
import { GuideList } from "@/components/dashboard/GuideList";
import { NewGuideButton } from "@/components/dashboard/NewGuideButton";
import { GuideWizard } from "@/components/wizard/GuideWizard";

export function DashboardShell() {
  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setGuides(getGuides());
  }, []);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-line pb-8 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition hover:text-accent"
            >
              <ArrowLeft className="size-4" />
              Back to landing
            </Link>
            <div>
              <h1 className="font-display text-5xl leading-none tracking-[-0.01em] text-text">
                Your guides
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Keep the top-level product small. Start in the wizard. Land in
                the builder. Export or hand off when the HTML preview feels
                right.
              </p>
            </div>
          </div>
          <NewGuideButton onClick={() => setWizardOpen(true)} />
        </div>

        <section className="mt-8">
          <GuideList guides={guides} />
        </section>
      </div>

      {wizardOpen ? (
        <GuideWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setGuides(getGuides());
            setWizardOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Replace GuideList.tsx**

```tsx
"use client";

import Link from "next/link";
import type { GuideRecord } from "@/types/guide";

export function GuideList({ guides }: { guides: GuideRecord[] }) {
  if (guides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          No guides yet
        </p>
        <h2 className="mt-3 font-display text-4xl tracking-[-0.01em] text-text">
          Start with your own material.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
          Paste rough notes, upload a working draft, or combine several expert
          sources. The wizard will shape the guide direction before the builder
          opens.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {guides.map((guide) => (
        <Link
          key={guide.id}
          href={`/builder/${guide.id}`}
          className="group grid gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent md:grid-cols-[1.3fr_0.7fr]"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              {guide.status}
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.01em] text-text">
              {guide.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              {guide.profile.goal} for {guide.profile.targetAudience}. Built in a{" "}
              {guide.profile.tone.toLowerCase()} tone with a{" "}
              {guide.profile.structureStyle.toLowerCase()} structure.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-line bg-surface-subtle p-4 text-sm text-muted">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Sources
              </p>
              <p className="mt-1 text-text">{guide.sources.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Reader level
              </p>
              <p className="mt-1 text-text">{guide.profile.readerLevel}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Updated
              </p>
              <p className="mt-1 text-text">
                {new Date(guide.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace NewGuideButton.tsx**

```tsx
"use client";

import { Plus } from "lucide-react";

export function NewGuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
    >
      <Plus className="size-4" />
      New guide
    </button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx src/components/dashboard/GuideList.tsx src/components/dashboard/NewGuideButton.tsx
git commit -m "design: restyle dashboard — flat layout, accent button, hover border on cards"
```

---

## Task 6: Restyle Builder

**Files:**
- Modify: `src/components/builder/BuilderShell.tsx`
- Modify: `src/components/builder/SourcePanel.tsx`
- Modify: `src/components/builder/PreviewPanel.tsx`
- Modify: `src/components/builder/ActionPanel.tsx`
- Modify: `src/components/builder/EmptyBuilderState.tsx`

- [ ] **Step 1: Replace BuilderShell.tsx**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { withGeneratedHtml } from "@/lib/celion-model";
import { getGuideById, saveGuide } from "@/lib/guide-storage";
import type { GuideRecord } from "@/types/guide";
import { SourcePanel } from "@/components/builder/SourcePanel";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { ActionPanel } from "@/components/builder/ActionPanel";

function readSectionIds(html: string) {
  return Array.from(html.matchAll(/data-section="([^"]+)"/g)).map(
    (match) => match[1] ?? "",
  );
}

export function BuilderShell({ guideId }: { guideId: string }) {
  const [guide, setGuide] = useState<GuideRecord | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setGuide(getGuideById(guideId));
  }, [guideId]);

  const sectionIds = useMemo(
    () => (guide?.html ? readSectionIds(guide.html) : []),
    [guide?.html],
  );

  const updateGuide = (nextGuide: GuideRecord, message: string) => {
    saveGuide(nextGuide);
    setGuide(nextGuide);
    setFeedback(message);
  };

  if (!guide) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-2xl border border-line bg-surface p-8 text-center shadow-float">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Guide not found
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.01em] text-text">
            This draft is not in local storage.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Open the dashboard, create a guide from the wizard, and the builder
            will have a local record to work with.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Builder
          </p>
          <h1 className="mt-0.5 font-display text-2xl tracking-[-0.01em] text-text">
            {guide.title}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-text transition hover:border-accent hover:text-accent"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </div>

      <section className="grid min-h-[calc(100vh-65px)] grid-cols-1 xl:grid-cols-[280px_1fr_320px]">
        <SourcePanel guide={guide} />
        <PreviewPanel html={guide.html} title={guide.title} />
        <ActionPanel
          hasHtml={Boolean(guide.html)}
          sectionIds={sectionIds}
          revisionPrompt={revisionPrompt}
          feedback={feedback}
          onRevisionPromptChange={setRevisionPrompt}
          onGenerateFirstDraft={() => {
            updateGuide(
              withGeneratedHtml(guide),
              "First HTML draft generated locally for the current shell.",
            );
          }}
          onRegenerateDraft={() => {
            updateGuide(
              withGeneratedHtml(guide),
              "Draft regenerated from the current source bundle.",
            );
          }}
          onReviseDraft={() => {
            if (!guide.html) {
              setFeedback("Generate a first draft before asking for revisions.");
              return;
            }

            updateGuide(
              withGeneratedHtml(guide, { revisionPrompt }),
              "Whole-draft revision applied locally. The real AI revision route comes next.",
            );
          }}
          onRegenerateSection={(sectionId) => {
            if (!guide.html) {
              setFeedback("Generate a first draft before regenerating a section.");
              return;
            }

            updateGuide(
              withGeneratedHtml(guide, {
                revisionPrompt:
                  revisionPrompt || `Refresh ${sectionId} for stronger clarity.`,
                targetSection: sectionId,
              }),
              `${sectionId} was regenerated with the current local shell logic.`,
            );
          }}
          onExportPdf={() => {
            if (!guide.html) {
              setFeedback("PDF export is unavailable before the first draft exists.");
              return;
            }

            const popup = window.open("", "_blank", "noopener,noreferrer");
            if (!popup) {
              setFeedback("The print window was blocked by the browser.");
              return;
            }

            popup.document.open();
            popup.document.write(guide.html);
            popup.document.close();
            popup.focus();
            popup.print();
            updateGuide(
              { ...guide, status: "exported", updatedAt: new Date().toISOString() },
              "Browser print opened. Save it as PDF from the print dialog.",
            );
          }}
          onFigmaHandoff={async () => {
            if (!guide.html) {
              setFeedback("Copy-to-Figma is unavailable before the first draft exists.");
              return;
            }

            await navigator.clipboard.writeText(guide.html);
            setFeedback(
              "HTML copied. You can paste it into your Figma handoff flow from here.",
            );
          }}
        />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Replace SourcePanel.tsx**

```tsx
import type { GuideRecord } from "@/types/guide";

export function SourcePanel({ guide }: { guide: GuideRecord }) {
  return (
    <aside className="flex h-full flex-col gap-4 border-r border-line bg-surface-subtle p-5">
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Status
        </p>
        <p className="mt-3 font-display text-3xl tracking-[-0.01em] text-text">
          {guide.status}
        </p>
        <p className="mt-3 text-sm leading-7 text-muted">
          This shell stores guide drafts locally for now. Database-backed
          versioning comes next.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Guide profile
        </p>
        <dl className="mt-4 grid gap-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Audience
            </dt>
            <dd className="mt-1 text-text">{guide.profile.targetAudience}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Goal
            </dt>
            <dd className="mt-1 text-text">{guide.profile.goal}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Style
            </dt>
            <dd className="mt-1 text-text">
              {guide.profile.tone} / {guide.profile.structureStyle}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Sources
        </p>
        <div className="mt-4 space-y-3">
          {guide.sources.map((source) => (
            <div
              key={source.id}
              className="rounded-lg border border-line bg-surface-subtle px-4 py-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {source.kind}
              </p>
              <p className="mt-2 text-sm font-medium text-text">{source.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{source.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Replace PreviewPanel.tsx**

```tsx
import { EmptyBuilderState } from "@/components/builder/EmptyBuilderState";

export function PreviewPanel({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  if (!html) {
    return <EmptyBuilderState />;
  }

  return (
    <div className="h-full bg-bg p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              Live preview
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-[-0.01em] text-text">
              {title}
            </h2>
          </div>
          <div className="rounded-full border border-line bg-surface-subtle px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            HTML
          </div>
        </div>
        <iframe title="Guide preview" srcDoc={html} className="h-full w-full border-0" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace EmptyBuilderState.tsx**

```tsx
export function EmptyBuilderState() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="max-w-xl rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          No HTML version yet
        </p>
        <h2 className="mt-3 font-display text-4xl tracking-[-0.01em] text-text">
          Generate the first draft when you are ready.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          Celion keeps the builder preview-first. Once a draft exists, revisions
          can target the full document or a specific `data-section` marker.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace ActionPanel.tsx**

```tsx
"use client";

type ActionPanelProps = {
  hasHtml: boolean;
  sectionIds: string[];
  revisionPrompt: string;
  feedback: string;
  onRevisionPromptChange: (value: string) => void;
  onGenerateFirstDraft: () => void;
  onRegenerateDraft: () => void;
  onReviseDraft: () => void;
  onRegenerateSection: (sectionId: string) => void;
  onExportPdf: () => void;
  onFigmaHandoff: () => void;
};

export function ActionPanel({
  hasHtml,
  sectionIds,
  revisionPrompt,
  feedback,
  onRevisionPromptChange,
  onGenerateFirstDraft,
  onRegenerateDraft,
  onReviseDraft,
  onRegenerateSection,
  onExportPdf,
  onFigmaHandoff,
}: ActionPanelProps) {
  return (
    <aside className="flex h-full flex-col gap-4 border-l border-line bg-surface p-5">
      <div className="rounded-xl border border-line bg-surface-subtle p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          AI actions
        </p>
        <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={onGenerateFirstDraft}
            className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
          >
            Generate first draft
          </button>
          <button
            type="button"
            onClick={onRegenerateDraft}
            disabled={!hasHtml}
            className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Regenerate full draft
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Revision prompt
        </p>
        <textarea
          value={revisionPrompt}
          onChange={(event) => onRevisionPromptChange(event.target.value)}
          placeholder="Make the tone sharper, shorten the intro, make it feel more practical..."
          className="mt-4 min-h-[144px] w-full rounded-lg border border-line bg-surface-subtle px-4 py-4 text-sm leading-7 text-text outline-none transition focus:border-accent"
        />
        <button
          type="button"
          onClick={onReviseDraft}
          disabled={!hasHtml || !revisionPrompt.trim()}
          className="mt-4 w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Revise whole draft
        </button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Section regeneration
        </p>
        <div className="mt-4 grid gap-2">
          {sectionIds.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-4 text-sm text-muted">
              No `data-section` markers are available yet.
            </p>
          ) : (
            sectionIds.map((sectionId) => (
              <button
                key={sectionId}
                type="button"
                onClick={() => onRegenerateSection(sectionId)}
                className="rounded-lg border border-line bg-surface-subtle px-4 py-3 text-left text-sm text-text transition hover:border-accent"
              >
                Regenerate {sectionId}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Output
        </p>
        <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!hasHtml}
            className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={onFigmaHandoff}
            disabled={!hasHtml}
            className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-text transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy HTML for Figma
          </button>
        </div>
        {feedback ? (
          <p className="mt-4 rounded-lg bg-accentSoft px-4 py-3 text-sm leading-6 text-text">
            {feedback}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/builder/BuilderShell.tsx src/components/builder/SourcePanel.tsx src/components/builder/PreviewPanel.tsx src/components/builder/ActionPanel.tsx src/components/builder/EmptyBuilderState.tsx
git commit -m "design: restyle builder — thin bar, surface-subtle panels, accent primary buttons"
```

---

## Task 7: Restyle Wizard

**Files:**
- Modify: `src/components/wizard/GuideWizard.tsx`
- Modify: `src/components/wizard/SourceStep.tsx`
- Modify: `src/components/wizard/ProfileStep.tsx`
- Modify: `src/components/wizard/StyleStep.tsx`

- [ ] **Step 1: Replace GuideWizard.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { z } from "zod";
import { createGuideRecord } from "@/lib/celion-model";
import { saveGuide } from "@/lib/guide-storage";
import type { GuideSource, SourceKind } from "@/types/guide";
import { useGuideWizardStore } from "@/store/useGuideWizardStore";
import { SourceStep } from "@/components/wizard/SourceStep";
import { ProfileStep } from "@/components/wizard/ProfileStep";
import { StyleStep } from "@/components/wizard/StyleStep";

const profileSchema = z.object({
  targetAudience: z.string().min(1, "Target audience is required."),
  goal: z.string().min(1, "Goal is required."),
  depth: z.string().min(1, "Depth is required."),
  tone: z.string().min(1, "Tone is required."),
  structureStyle: z.string().min(1, "Structure style is required."),
  readerLevel: z.string().min(1, "Reader level is required."),
});

function getFileKind(fileName: string): SourceKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "txt" || ext === "pdf" || ext === "docx") {
    return ext;
  }

  return null;
}

async function buildSources(
  pastedText: string,
  files: File[],
): Promise<GuideSource[]> {
  const sources: GuideSource[] = [];

  if (pastedText.trim()) {
    sources.push({
      id: crypto.randomUUID(),
      kind: "pasted_text",
      name: "Pasted source",
      content: pastedText.trim(),
      excerpt: pastedText.trim().slice(0, 180),
    });
  }

  for (const file of files) {
    const kind = getFileKind(file.name);
    if (!kind) {
      throw new Error(`${file.name} is not a supported file type.`);
    }

    let content = "";

    if (kind === "md" || kind === "txt") {
      content = (await file.text()).trim();
    } else {
      content = `${file.name} was uploaded successfully. Deep extraction for ${kind.toUpperCase()} files will be connected in the next backend slice.`;
    }

    sources.push({
      id: crypto.randomUUID(),
      kind,
      name: file.name,
      content,
      excerpt: content.slice(0, 180),
    });
  }

  return sources;
}

export function GuideWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const {
    step,
    pastedText,
    files,
    targetAudience,
    goal,
    depth,
    tone,
    structureStyle,
    readerLevel,
    error,
    setStep,
    setPastedText,
    setFiles,
    setField,
    setError,
    reset,
  } = useGuideWizardStore();
  const [submitting, setSubmitting] = useState(false);

  const validateStep = () => {
    if (step === 1) {
      if (!pastedText.trim() && files.length === 0) {
        setError("At least one pasted source or uploaded file is required.");
        return false;
      }

      const hwpFile = files.find((file) => /\.(hwp|hwpx)$/i.test(file.name));
      if (hwpFile) {
        setError("HWP and HWPX files are not supported in Celion v1.");
        return false;
      }
    }

    if (step >= 2) {
      const parsed = profileSchema.safeParse({
        targetAudience,
        goal,
        depth,
        tone,
        structureStyle,
        readerLevel,
      });

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please complete the fields.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    }
  };

  const handleCreate = async () => {
    if (!validateStep()) {
      return;
    }

    setSubmitting(true);

    try {
      const sources = await buildSources(pastedText, files);
      if (sources.length === 0) {
        setError("No usable source content was found.");
        return;
      }

      const guide = createGuideRecord({
        sources,
        profile: {
          targetAudience,
          goal,
          depth,
          tone,
          structureStyle,
          readerLevel,
        },
      });

      saveGuide(guide);
      reset();
      onCreated();
      router.push(`/builder/${guide.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Celion could not create the guide draft.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 backdrop-blur-sm md:p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col rounded-2xl border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-line px-6 py-5 md:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
              New guide wizard
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.01em] text-text">
              Shape the draft before the builder opens
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-full border border-line bg-surface p-3 text-text transition hover:border-accent hover:text-accent"
            aria-label="Close wizard"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-hidden px-6 py-6 md:grid-cols-[220px_1fr] md:px-8">
          <aside className="rounded-xl border border-line bg-surface-subtle p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              Flow
            </p>
            <div className="mt-5 space-y-2">
              {[
                "1. Source intake",
                "2. Guide direction",
                "3. Style tuning",
              ].map((label, index) => (
                <div
                  key={label}
                  className={`rounded-lg border px-4 py-3 text-sm transition ${
                    step === index + 1
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </aside>

          <div className="flex flex-col justify-between gap-6 overflow-y-auto rounded-xl border border-line bg-surface p-5 md:p-6">
            <div className="space-y-5">
              {step === 1 ? (
                <SourceStep
                  pastedText={pastedText}
                  fileNames={files.map((file) => file.name)}
                  error={error}
                  onTextChange={setPastedText}
                  onFilesChange={setFiles}
                />
              ) : null}

              {step === 2 ? (
                <ProfileStep
                  targetAudience={targetAudience}
                  goal={goal}
                  depth={depth}
                  onFieldChange={setField}
                />
              ) : null}

              {step === 3 ? (
                <StyleStep
                  tone={tone}
                  structureStyle={structureStyle}
                  readerLevel={readerLevel}
                  onFieldChange={setField}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
              {error ? (
                <p className="rounded-lg bg-accentSoft px-4 py-3 text-sm text-accent">
                  {error}
                </p>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3 self-end">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-medium text-text transition hover:border-accent"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                ) : null}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Open builder"}
                    <ArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace SourceStep.tsx**

```tsx
"use client";

import { FileText, UploadCloud } from "lucide-react";

type SourceStepProps = {
  pastedText: string;
  fileNames: string[];
  error: string;
  onTextChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
};

export function SourceStep({
  pastedText,
  fileNames,
  error,
  onTextChange,
  onFilesChange,
}: SourceStepProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Paste source material
        </p>
        <h3 className="mt-3 font-display text-3xl leading-tight tracking-[-0.01em] text-text">
          Start with the knowledge you already own.
        </h3>
        <textarea
          value={pastedText}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Drop in rough notes, old drafts, transcripts, or any text you want to turn into a guide."
          className="mt-5 min-h-[280px] w-full rounded-lg border border-line bg-surface-subtle px-5 py-4 text-sm leading-7 text-text outline-none transition focus:border-accent"
        />
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 size-5 text-text" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                Upload files
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Support: PDF, MD, TXT, DOCX. HWP is intentionally blocked.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line bg-surface-subtle px-5 py-8 text-center text-sm leading-7 text-muted transition hover:border-accent">
            Choose files
            <input
              type="file"
              multiple
              accept=".pdf,.md,.txt,.docx"
              className="hidden"
              onChange={(event) =>
                onFilesChange(Array.from(event.target.files ?? []))
              }
            />
          </label>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Current intake
          </p>
          <div className="mt-4 space-y-3">
            {fileNames.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line px-4 py-4 text-sm text-muted">
                No files selected yet.
              </div>
            ) : (
              fileNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface-subtle px-4 py-4 text-sm text-text"
                >
                  <FileText className="size-4" />
                  {name}
                </div>
              ))
            )}
          </div>
          {error ? (
            <p className="mt-4 rounded-lg bg-accentSoft px-4 py-3 text-sm text-accent">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace ProfileStep.tsx**

```tsx
"use client";

type ProfileStepProps = {
  targetAudience: string;
  goal: string;
  depth: string;
  onFieldChange: (field: "targetAudience" | "goal" | "depth", value: string) => void;
};

export function ProfileStep({
  targetAudience,
  goal,
  depth,
  onFieldChange,
}: ProfileStepProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <label className="rounded-xl border border-line bg-surface p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Target audience
        </p>
        <input
          value={targetAudience}
          onChange={(event) => onFieldChange("targetAudience", event.target.value)}
          placeholder="Founders, creators, junior marketers..."
          className="mt-5 w-full rounded-lg border border-line bg-surface-subtle px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
        />
      </label>

      <label className="rounded-xl border border-line bg-surface p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Goal
        </p>
        <input
          value={goal}
          onChange={(event) => onFieldChange("goal", event.target.value)}
          placeholder="Teach a workflow, package an offer, explain a framework..."
          className="mt-5 w-full rounded-lg border border-line bg-surface-subtle px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
        />
      </label>

      <label className="rounded-xl border border-line bg-surface p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Depth
        </p>
        <select
          value={depth}
          onChange={(event) => onFieldChange("depth", event.target.value)}
          className="mt-5 w-full rounded-lg border border-line bg-surface-subtle px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
        >
          <option>Short and sharp</option>
          <option>Standard</option>
          <option>Deep dive</option>
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Replace StyleStep.tsx**

```tsx
"use client";

type StyleStepProps = {
  tone: string;
  structureStyle: string;
  readerLevel: string;
  onFieldChange: (
    field: "tone" | "structureStyle" | "readerLevel",
    value: string,
  ) => void;
};

const tones = ["Expert", "Coach-like", "Practical", "Concise"];
const structures = ["Roadmap", "Checklist", "Step-by-step", "Concept-first"];
const levels = ["Beginner", "Practitioner", "Advanced"];

export function StyleStep({
  tone,
  structureStyle,
  readerLevel,
  onFieldChange,
}: StyleStepProps) {
  const renderPills = (
    label: string,
    value: string,
    options: string[],
    field: "tone" | "structureStyle" | "readerLevel",
  ) => (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFieldChange(field, option)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === option
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface-subtle text-text hover:border-accent"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {renderPills("Tone", tone, tones, "tone")}
      {renderPills("Structure style", structureStyle, structures, "structureStyle")}
      {renderPills("Reader level", readerLevel, levels, "readerLevel")}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/wizard/GuideWizard.tsx src/components/wizard/SourceStep.tsx src/components/wizard/ProfileStep.tsx src/components/wizard/StyleStep.tsx
git commit -m "design: restyle wizard — white modal, accent steps, rounded-xl inputs"
```

---

## Task 8: Final typecheck

- [ ] **Step 1: Run typecheck**

```bash
cd c:/Users/dasar/Desktop/celion && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: If errors, fix them inline before committing**
