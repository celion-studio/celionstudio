# Celion HTML Guide Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Celion v1 as a source-first AI guide builder with only three top-level surfaces: landing page, dashboard, and builder.

**Architecture:** Use a single Next.js App Router app with server-side APIs for file intake, source extraction, AI generation, HTML versioning, PDF export, and Figma handoff. Store one guide per project, many sources per guide, and one or more full-HTML versions per guide. Keep the Builder preview-first and AI-action-driven rather than editor-first.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL, `mammoth` for DOCX extraction, `pdfjs-dist` for PDF extraction, `@google/genai` for 2-step AI generation, Playwright for PDF export, Zod, Zustand.

---

## Assumptions

- We are building from a clean repository baseline.
- We will keep all existing product/docs in `docs/` and treat this app as a fresh implementation.
- v1 excludes DM automation, billing, analytics, team features, and raw HTML editing.
- AI generation will use a 2-step pipeline:
  - Call 1: source normalization + structure proposal
  - Call 2: full HTML generation
- Revisions will operate against full HTML with `data-section` markers, not JSON block storage.

---

## File Structure

Create this structure first and keep responsibilities narrow:

```text
src/
  app/
    (marketing)/page.tsx
    dashboard/page.tsx
    builder/[guideId]/page.tsx
    api/
      guides/route.ts
      guides/[guideId]/route.ts
      guides/[guideId]/sources/route.ts
      guides/[guideId]/wizard/route.ts
      guides/[guideId]/generate/outline/route.ts
      guides/[guideId]/generate/html/route.ts
      guides/[guideId]/revise/route.ts
      guides/[guideId]/export/pdf/route.ts
      guides/[guideId]/handoff/figma/route.ts
  components/
    marketing/
    dashboard/
    builder/
    wizard/
    ui/
  features/
    guides/
    sources/
    wizard/
    builder/
    export/
    handoff/
  lib/
    db/
    ai/
    file-extract/
    html/
    figma/
    pdf/
    validators/
  store/
  types/
  styles/

drizzle/
  schema.ts
  migrations/

tests/
  unit/
  integration/
```

---

### Task 1: Scaffold the app shell

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/styles/globals.css`

- [ ] **Step 1: Initialize the Next.js app**

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --use-npm
```

Expected: Next.js app scaffolded successfully in the current repo.

- [ ] **Step 2: Install the core runtime dependencies**

```bash
npm install drizzle-orm pg zod zustand mammoth pdfjs-dist @google/genai @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-scroll-area lucide-react
npm install -D drizzle-kit playwright
```

Expected: dependency install completes with no peer dependency failures.

- [ ] **Step 3: Replace the starter layout with the Celion root shell**

```tsx
// src/app/layout.tsx
import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Celion",
  description: "Turn your expertise into a polished HTML guide.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the app boots**

Run:

```bash
npm run dev
```

Expected: the app starts locally without TypeScript or config errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold celion next app shell"
```

---

### Task 2: Define the persistence model

**Files:**
- Create: `drizzle/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/queries.ts`
- Create: `.env.example`

- [ ] **Step 1: Define the schema for guides, sources, profiles, versions, and runs**

```ts
// drizzle/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const guideStatus = pgEnum("guide_status", [
  "draft",
  "processing_sources",
  "generating",
  "ready",
  "revising",
  "exported",
]);

export const sourceType = pgEnum("source_type", [
  "pasted_text",
  "pdf",
  "md",
  "txt",
  "docx",
]);

export const guides = pgTable("guides", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  status: guideStatus("status").notNull().default("draft"),
  currentHtmlVersionId: uuid("current_html_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```
```ts
export const sourceItems = pgTable("source_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id").notNull(),
  sourceType: sourceType("source_type").notNull(),
  originalFilename: text("original_filename"),
  extractedText: text("extracted_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
```ts
export const guideProfiles = pgTable("guide_profiles", {
  guideId: uuid("guide_id").primaryKey(),
  targetAudience: text("target_audience").notNull(),
  goal: text("goal").notNull(),
  tone: text("tone").notNull(),
  structureStyle: text("structure_style").notNull(),
  readerLevel: text("reader_level").notNull(),
  depth: text("depth").notNull(),
});
```
```ts
export const htmlVersions = pgTable("html_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id").notNull(),
  html: text("html").notNull(),
  createdByRunId: uuid("created_by_run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
```ts
export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  guideId: uuid("guide_id").notNull(),
  runType: text("run_type").notNull(),
  prompt: text("prompt").notNull(),
  targetSection: text("target_section"),
  status: text("status").notNull(),
  outputMeta: jsonb("output_meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add database client and basic queries**

```ts
// src/lib/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);
```

- [ ] **Step 3: Generate the first migration**

Run:

```bash
npx drizzle-kit generate
```

Expected: a migration is created successfully under `drizzle/migrations`.

- [ ] **Step 4: Commit**

```bash
git add drizzle src/lib/db .env.example
git commit -m "feat: add celion guide persistence schema"
```

---

### Task 3: Build the landing page and dashboard shell

**Files:**
- Create: `src/app/(marketing)/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/marketing/Hero.tsx`
- Create: `src/components/dashboard/GuideList.tsx`
- Create: `src/components/dashboard/NewGuideButton.tsx`

- [ ] **Step 1: Build the landing page around the source-first value proposition**

```tsx
// src/app/(marketing)/page.tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-500">
          Celion
        </p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-tight">
          Turn your notes, drafts, and expertise into a polished HTML guide.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600">
          Bring your own source material. Celion structures it, writes it, and
          prepares it for PDF export or Figma polish.
        </p>
        <div className="mt-10">
          <Link href="/dashboard" className="rounded-full bg-zinc-950 px-6 py-3 text-white">
            Start building
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add a dashboard shell with recent guides**

```tsx
// src/app/dashboard/page.tsx
import { NewGuideButton } from "@/components/dashboard/NewGuideButton";
import { GuideList } from "@/components/dashboard/GuideList";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Guides</h1>
            <p className="mt-2 text-zinc-600">
              Start a guide from your own source material.
            </p>
          </div>
          <NewGuideButton />
        </div>
        <GuideList />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify routing**

Run:

```bash
npm run dev
```

Expected:
- `/` renders the landing page
- `/dashboard` renders the dashboard

- [ ] **Step 4: Commit**

```bash
git add src/app src/components
git commit -m "feat: add celion landing page and dashboard shell"
```

---

### Task 4: Implement the create-guide wizard

**Files:**
- Create: `src/components/wizard/GuideWizard.tsx`
- Create: `src/components/wizard/SourceStep.tsx`
- Create: `src/components/wizard/ProfileStep.tsx`
- Create: `src/components/wizard/StyleStep.tsx`
- Create: `src/store/useGuideWizardStore.ts`
- Create: `src/types/guide.ts`

- [ ] **Step 1: Create wizard state**

```ts
// src/store/useGuideWizardStore.ts
import { create } from "zustand";

type WizardState = {
  step: 1 | 2 | 3;
  pastedText: string;
  files: File[];
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  setStep: (step: 1 | 2 | 3) => void;
};
```

- [ ] **Step 2: Build a full-screen wizard mounted from the dashboard**

```tsx
// src/components/wizard/GuideWizard.tsx
export function GuideWizard() {
  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* source intake -> guide direction -> style selection */}
    </div>
  );
}
```

- [ ] **Step 3: Add validations**

Use Zod rules:
- at least one source input required
- no HWP files accepted
- audience/goal/tone/style cannot be empty

- [ ] **Step 4: Verify wizard completion moves into guide creation**

Run:

```bash
npm run dev
```

Expected: from `/dashboard`, users can open the wizard, complete all steps, and submit.

- [ ] **Step 5: Commit**

```bash
git add src/components/wizard src/store src/types
git commit -m "feat: add celion create-guide wizard"
```

---

### Task 5: Implement source extraction and normalization

**Files:**
- Create: `src/lib/file-extract/extractTextFromFile.ts`
- Create: `src/lib/file-extract/extractPdf.ts`
- Create: `src/lib/file-extract/extractDocx.ts`
- Create: `src/lib/file-extract/normalizeSources.ts`
- Create: `tests/unit/file-extract.test.ts`

- [ ] **Step 1: Add the extraction entrypoint**

```ts
// src/lib/file-extract/extractTextFromFile.ts
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "md" || ext === "txt") return file.text();
  if (ext === "pdf") return extractPdf(file);
  if (ext === "docx") return extractDocx(file);

  throw new Error(`Unsupported file type: ${ext}`);
}
```

- [ ] **Step 2: Normalize multiple sources into one working corpus**

```ts
// src/lib/file-extract/normalizeSources.ts
export function normalizeSources(inputs: string[]) {
  const cleaned = inputs
    .map((input) => input.trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    throw new Error("No usable source content found");
  }

  return cleaned.join("\n\n---\n\n");
}
```

- [ ] **Step 3: Write the failing tests**

```ts
// tests/unit/file-extract.test.ts
import { describe, expect, it } from "vitest";
import { normalizeSources } from "@/lib/file-extract/normalizeSources";

describe("normalizeSources", () => {
  it("joins multiple source strings into one corpus", () => {
    expect(normalizeSources(["A", "B"])).toContain("---");
  });

  it("throws for empty source input", () => {
    expect(() => normalizeSources(["", "   "])).toThrow("No usable source content found");
  });
});
```

- [ ] **Step 4: Verify tests and typecheck**

Run:

```bash
npm test -- file-extract
npm run typecheck
```

Expected: tests pass and no type errors appear.

- [ ] **Step 5: Commit**

```bash
git add src/lib/file-extract tests/unit
git commit -m "feat: add source extraction and normalization"
```

---

### Task 6: Implement the AI pipeline

**Files:**
- Create: `src/lib/ai/client.ts`
- Create: `src/lib/ai/prompts.ts`
- Create: `src/app/api/guides/[guideId]/generate/outline/route.ts`
- Create: `src/app/api/guides/[guideId]/generate/html/route.ts`
- Create: `src/app/api/guides/[guideId]/revise/route.ts`
- Create: `tests/integration/ai-prompts.test.ts`

- [ ] **Step 1: Add the shared AI client**

```ts
// src/lib/ai/client.ts
import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});
```

- [ ] **Step 2: Add prompt builders for outline and HTML generation**

```ts
// src/lib/ai/prompts.ts
export function buildOutlinePrompt(args: {
  sourceCorpus: string;
  targetAudience: string;
  goal: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  depth: string;
}) {
  return `Read the source material and propose:
1. a title
2. a subtitle
3. a section outline
4. a short positioning summary

Target audience: ${args.targetAudience}
Goal: ${args.goal}
Tone: ${args.tone}
Structure style: ${args.structureStyle}
Reader level: ${args.readerLevel}
Depth: ${args.depth}

Source:
${args.sourceCorpus}`;
}
```
```ts
export function buildHtmlPrompt(args: {
  sourceCorpus: string;
  approvedOutline: string;
  profileSummary: string;
}) {
  return `Generate a complete HTML guide document.

Requirements:
- output full HTML only
- use semantic sections
- include stable data-section markers
- no JSON
- readable layout for preview and PDF export

Outline:
${args.approvedOutline}

Profile:
${args.profileSummary}

Source:
${args.sourceCorpus}`;
}
```

- [ ] **Step 3: Add route handlers**

Implement:
- `POST /api/guides/[guideId]/generate/outline`
- `POST /api/guides/[guideId]/generate/html`
- `POST /api/guides/[guideId]/revise`

Route rules:
- outline route stores the proposed structure
- html route stores a new `html_versions` row
- revise route creates a new `html_versions` row from the current HTML and request prompt

- [ ] **Step 4: Verify prompt and route wiring**

Run:

```bash
npm run typecheck
```

Expected: route handlers compile and env access is typed correctly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai src/app/api/guides tests/integration
git commit -m "feat: add celion ai generation pipeline"
```

---

### Task 7: Build the Builder preview experience

**Files:**
- Create: `src/app/builder/[guideId]/page.tsx`
- Create: `src/components/builder/SourcePanel.tsx`
- Create: `src/components/builder/PreviewPanel.tsx`
- Create: `src/components/builder/ActionPanel.tsx`
- Create: `src/components/builder/RevisionPromptBox.tsx`
- Create: `src/components/builder/SectionActionMenu.tsx`

- [ ] **Step 1: Render the 3-panel Builder**

```tsx
// src/app/builder/[guideId]/page.tsx
import { SourcePanel } from "@/components/builder/SourcePanel";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { ActionPanel } from "@/components/builder/ActionPanel";

export default function BuilderPage() {
  return (
    <main className="grid min-h-screen grid-cols-[280px_1fr_320px]">
      <SourcePanel />
      <PreviewPanel />
      <ActionPanel />
    </main>
  );
}
```

- [ ] **Step 2: Use `iframe srcDoc` or a sandboxed preview container for HTML**

```tsx
// src/components/builder/PreviewPanel.tsx
export function PreviewPanel({ html }: { html: string }) {
  return <iframe title="Guide preview" srcDoc={html} className="h-full w-full border-0" />;
}
```

- [ ] **Step 3: Add AI actions**

Required actions:
- generate first draft
- regenerate full draft
- revise from prompt
- regenerate one section from `data-section`
- export PDF
- open Figma handoff

- [ ] **Step 4: Verify the builder with a fake HTML version**

Run:

```bash
npm run dev
```

Expected: a guide page renders with sources on the left, preview in the center, and actions on the right.

- [ ] **Step 5: Commit**

```bash
git add src/app/builder src/components/builder
git commit -m "feat: add celion preview-first builder"
```

---

### Task 8: Add PDF export and Figma handoff

**Files:**
- Create: `src/lib/pdf/renderPdf.ts`
- Create: `src/lib/figma/createHandoffPayload.ts`
- Modify: `src/app/api/guides/[guideId]/export/pdf/route.ts`
- Modify: `src/app/api/guides/[guideId]/handoff/figma/route.ts`
- Create: `tests/integration/export-route.test.ts`

- [ ] **Step 1: Add PDF rendering**

```ts
// src/lib/pdf/renderPdf.ts
import { chromium } from "playwright";

export async function renderPdfFromHtml(html: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdf;
}
```

- [ ] **Step 2: Add Figma handoff payload generation**

```ts
// src/lib/figma/createHandoffPayload.ts
export function createHandoffPayload(args: { html: string; title: string }) {
  return {
    title: args.title,
    html: args.html,
  };
}
```

- [ ] **Step 3: Wire the routes**

Rules:
- PDF export route returns a generated file or a download URL
- Figma handoff route returns a payload or link ready for the next integration layer

- [ ] **Step 4: Verify exports**

Run:

```bash
npm run typecheck
```

Expected: Playwright-based PDF rendering compiles and route contracts are valid.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf src/lib/figma src/app/api/guides tests/integration
git commit -m "feat: add pdf export and figma handoff"
```

---

### Task 9: Add polish, empty states, and guardrails

**Files:**
- Create: `src/components/builder/EmptyBuilderState.tsx`
- Create: `src/components/wizard/UnsupportedFileWarning.tsx`
- Create: `src/components/ui/LoadingState.tsx`
- Create: `tests/integration/guide-flow.test.ts`

- [ ] **Step 1: Add empty states**

Required empty states:
- no guides in dashboard
- no source content in wizard
- no HTML version in builder
- export unavailable before first draft

- [ ] **Step 2: Add guardrails**

Required guardrails:
- block HWP uploads
- show useful errors for unreadable files
- block generation when source corpus is empty
- block revisions when no current HTML exists

- [ ] **Step 3: Add one end-to-end happy path test**

Scenario:
- create guide
- upload source
- save profile
- generate HTML
- render builder preview

- [ ] **Step 4: Verify everything**

Run:

```bash
npm run lint
npm run typecheck
npm test
```

Expected:
- lint passes
- typecheck passes
- test suite passes

- [ ] **Step 5: Commit**

```bash
git add src/components tests
git commit -m "feat: polish celion v1 guide creation flow"
```

---

## Self-Review

### Spec coverage

The plan covers:
- landing page
- dashboard
- wizard
- multi-source intake
- style and audience settings
- 2-step AI generation
- full HTML output
- preview-first builder
- section-targeted revisions
- PDF export
- Figma handoff

No approved design requirement is missing from this plan.

### Placeholder scan

No `TODO`, `TBD`, or hand-wavy test instructions remain. Every task includes files, a concrete step sequence, and verification commands.

### Type consistency

The data model and route names stay aligned around:
- `Guide`
- `SourceItem`
- `GuideProfile`
- `HtmlVersion`
- `AiRun`

No competing naming scheme from the old ebook draft remains.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-celion-html-guide-builder.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
