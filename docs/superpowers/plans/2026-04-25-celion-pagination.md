# Celion Visual Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Celion's visual pagination into owned ProseMirror plugin modules with tested page-break calculation and safe footer rendering.

**Architecture:** Keep Tiptap as the editor shell and use a ProseMirror plugin for visual pagination decorations. The saved document remains one canonical Tiptap/ProseMirror document; pagination is display state only.

**Tech Stack:** Next.js, React, TypeScript, Tiptap, ProseMirror via `@tiptap/pm`, Node test runner.

---

## File Structure

- Create `src/components/editor/pagination/pagination-types.ts`
  - Shared pagination options, measured block, break, and state types.
- Create `src/components/editor/pagination/page-breaks.ts`
  - Pure page metrics, break calculation, state comparison, and footer token rendering.
- Create `src/components/editor/pagination/page-breaks.test.ts`
  - Unit tests for the pure pagination rules.
- Create `src/components/editor/pagination/page-measurement.ts`
  - DOM measurement helpers for top-level ProseMirror blocks.
- Create `src/components/editor/pagination/page-chrome.ts`
  - Safe DOM widget creation for first page, page breaks, and hard-break spacer decorations.
- Create `src/components/editor/pagination/pagination-plugin.ts`
  - ProseMirror plugin assembly, scheduling, state mapping, and decoration wiring.
- Modify `src/components/editor/CelionPaginationExtension.ts`
  - Keep only the Tiptap extension wrapper and default options.
- Modify `package.json`
  - Add the new pagination unit test to `test:unit`.

---

### Task 1: Pure Pagination Calculation

**Files:**
- Create: `src/components/editor/pagination/pagination-types.ts`
- Create: `src/components/editor/pagination/page-breaks.ts`
- Create: `src/components/editor/pagination/page-breaks.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add shared types**

Create `pagination-types.ts` with option, block, break, and state contracts used by both tests and the ProseMirror plugin.

- [ ] **Step 2: Add failing tests**

Create `page-breaks.test.ts` covering empty state, fitting content, overflow before a block, oversized top-of-page block, multiple pages, footer token rendering, and state comparison.

- [ ] **Step 3: Run the focused test and confirm it fails**

Run: `node --import tsx src/components/editor/pagination/page-breaks.test.ts`

Expected: fail because `page-breaks.ts` does not exist yet.

- [ ] **Step 4: Implement pure functions**

Create `page-breaks.ts` with:

- `getPaginationMetrics(options)`
- `measurePaginationBreaks(blocks, options)`
- `renderPaginationTemplate(template, pageNumber, totalPages)`
- `samePaginationState(a, b)`

- [ ] **Step 5: Run focused test and confirm it passes**

Run: `node --import tsx src/components/editor/pagination/page-breaks.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Wire test into unit script**

Add `node --import tsx src/components/editor/pagination/page-breaks.test.ts` to `package.json` `test:unit`.

---

### Task 2: ProseMirror Plugin Module Split

**Files:**
- Create: `src/components/editor/pagination/page-measurement.ts`
- Create: `src/components/editor/pagination/page-chrome.ts`
- Create: `src/components/editor/pagination/pagination-plugin.ts`
- Modify: `src/components/editor/CelionPaginationExtension.ts`

- [ ] **Step 1: Extract measurement**

Create `page-measurement.ts` with `measureTopLevelBlocks(view)` and `measureContentBottom(view)`.

- [ ] **Step 2: Extract safe page chrome**

Create `page-chrome.ts` with `createFirstPageWidget`, `createPageBreakWidget`, `createHardBreakSpacer`, and `buildPaginationDecorations`.

- [ ] **Step 3: Extract ProseMirror plugin**

Create `pagination-plugin.ts` with `paginationKey` and `createCelionPaginationPlugin(options)`.

- [ ] **Step 4: Reduce wrapper**

Replace `CelionPaginationExtension.ts` with a small Tiptap `Extension.create` wrapper that imports `createCelionPaginationPlugin`.

- [ ] **Step 5: Run typecheck**

Run: `npm.cmd run typecheck`

Expected: pass.

---

### Task 3: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run unit tests**

Run: `npm.cmd run test:unit`

Expected: pass.

- [ ] **Step 2: Run typecheck**

Run: `npm.cmd run typecheck`

Expected: pass.

- [ ] **Step 3: Inspect diff**

Run: `git diff --stat` and `git diff -- src/components/editor/CelionPaginationExtension.ts src/components/editor/pagination package.json`

Expected: pagination changes are scoped to the new modules, wrapper, and unit-test script.
