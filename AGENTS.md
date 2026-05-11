# AGENTS.md

This file is the operating guide for AI agents working in this repository. Keep it short, practical, and current.

## Project Contract

Celion is a Next.js App Router app for turning source material into editable ebooks.

Current stack:

- Next.js 16, React 19, TypeScript 5
- Tailwind CSS 3, PostCSS, CSS custom properties
- Zustand and Zod
- Neon Auth and Neon Postgres
- Gemini on Vertex AI through `@google/genai`
- Client-side export with `html2canvas` and `jspdf`

Primary docs:

- `tech-spec.md` is the runtime contract.
- `design.md` is the product and visual design contract.
- If docs conflict with current code, code wins; update docs when the mismatch matters.

Current active routes:

- `/`
- `/auth`
- `/dashboard`
- `/editor/[projectId]`
- `/pricing`

Do not reintroduce these removed or inactive surfaces unless the user explicitly asks:

- `/new`
- auth modal flows
- Tiptap editor paths
- raw canvas routes
- placeholder footer links
- inactive settings UI
- batch or multi-call ebook generation optimization

## Workflow

For non-trivial work, write a short plan first. Non-trivial means cross-file edits, architecture choices, auth/session changes, generation changes, DB/persistence changes, or UI changes that need browser validation.

Default sequence:

1. Inspect before editing.
2. Make the smallest correct change.
3. Preserve user changes and unrelated dirty files.
4. Verify with the narrowest useful command.
5. Summarize changes, verification, and remaining risk.

Never claim success without verification. If a verification command cannot be run, say why.

## Product Guardrails

- MVP first. Prefer simple, direct behavior over broad platform architecture.
- New projects start from `/dashboard` and open `/editor/[projectId]`.
- The editor setup wizard is embedded in the editor for empty draft projects.
- Keep `plan` as the product/code term. Do not bring back `blueprint`.
- The page-level `ebook_document` is the editable source of truth.
- Compiled `ebook_html` is a preview/export artifact and legacy fallback.
- Ebook generation prompts are sensitive. Explain intent before changing prompt structure, page budget, model choice, or output contract.
- Do not increase the plan/page budget, add batching, or split generation calls unless explicitly requested.

## Design Guardrails

Celion should feel like a minimal creator studio: neutral, precise, output-led, commercially sharp.

Follow `design.md`:

- Output first; UI chrome frames the work.
- Neutral first; avoid beige lifestyle warmth.
- Creator tool, not admin dashboard.
- Soft-square geometry: usually 8px to 12px radius.
- Color belongs mostly to generated output, previews, thumbnails, and images.
- Use hairlines and spacing before shadows.
- Avoid generic AI SaaS patterns, purple/blue gradients, decorative blobs, glassmorphism, bokeh, and over-rounded pill systems.
- Do not add decorative eyebrow labels, section kickers, or overline labels above marketing or landing section headings. Make the heading or supporting copy clearer instead.
- Use Framer Motion for new React UI animations. Keep CSS keyframes only for legacy styles or isolated decorative loops.

Prefer existing CSS custom properties and established component classes. Remove inline styles when touching nearby UI unless doing so would expand scope too much.

For design-heavy work, useful global skills include:

- `redesign-existing-projects`
- `minimalist-ui`
- `design-taste-frontend`
- `frontend-design`
- `design-review`
- `copywriting`

Use these as guidance, but keep Celion's own `design.md` above external taste defaults.

## Subagent Routing

Use subagents only when they materially help. Do not delegate tiny one- or two-file edits.

Good delegation targets:

- UI implementation: `frontend-developer`, `react-specialist`, `nextjs-developer`
- Visual direction/review: `ui-designer`, `design-review`, `frontend-design`
- Auth/session flows: parent investigates first; use `neon-postgres` or auth specialists for focused review only
- Neon schema/query/persistence: `neon-postgres`, `postgres-pro`, `database-optimizer`
- AI generation and prompts: `prompt-engineer`, `senior-prompt-engineer`, `risk-desk`, `structure-analyst`
- Editor/export regressions: `frontend-developer`, `debugger`, `test-automator`, `qa-only`
- Security review: `security-auditor`
- Final code review: `code-reviewer`

Delegation rules:

- Parent agent owns the plan, shared core files, final integration, and final verification.
- Give each subagent a narrow scope, allowed files, forbidden files, success criteria, and required verification.
- Do not let multiple agents edit the same shared core area at the same time.
- Subagents should report changed files, reasoning, verification, and residual risk.

Shared core areas that need extra care:

- `src/lib/session.ts`
- `src/lib/auth.ts`
- `src/lib/auth-redirect.ts`
- `src/lib/db/*`
- `src/lib/projects.ts`
- `src/lib/ebook-generation.ts`
- `src/lib/ebook-generate-request.ts`
- `src/lib/ebook-document.ts`
- `src/lib/ebook-html.ts`
- `src/components/editor/*`
- `src/components/wizard/*`

## Verification Gates

Available scripts:

```text
npm run typecheck
npm run test:unit
npm run build
npm run db:init
npm run build:deploy:init-db
```

When global `npm` is broken, use direct commands:

```text
node .\node_modules\typescript\bin\tsc --noEmit
node --import tsx <test-file>
node .\node_modules\next\dist\bin\next build
```

Minimum verification:

- Any code change: typecheck.
- UI change: typecheck plus browser smoke test for the affected route when practical.
- Auth change: test `/auth`, `/dashboard`, and protected `/editor/[projectId]` redirect behavior when practical.
- AI generation change: run relevant `ebook-generation`, `ebook-generate-request`, `ebook-document`, `ebook-html`, and `ai/json` tests.
- Editor/export change: run editor preview/document/export cleanup tests.
- DB/project persistence change: run `projects`, `db/index`, and `db/schema` tests.
- Cross-cutting change: run `npm run test:unit` when feasible.

Do not run `npm run db:init` against a real or shared database without explicit user approval.

## Git And Safety

- Do not revert user changes unless explicitly asked.
- Do not use destructive git commands unless explicitly asked.
- Before large reversions or merge recovery, inspect `git status`, `git log`, and the relevant diff first.
- Keep generated local artifacts out of commits unless the user asks to track them.
- `.env.local` and secrets must remain uncommitted.

## Response Style

When finishing work, keep the response brief:

```text
Summary:
- ...

Verified:
- ...

Notes:
- ...
```
