# 2026-05-04 Product Backlog

## Context

Current baseline: `89b04c1 cloudflare` on `main`.

Celion now has one core product surface: the ebook editor. The old Tiptap document editor is gone, page-level `ebook_document` is the editing source of truth, and `ebook_html` remains as a compiled cache for preview/export compatibility.

This backlog captures the next areas that need attention after the editor cleanup and initial Cloudflare R2 work.

## P0: Deployment And Environment

These block reliable production use.

- Finish production environment setup for Vercel/Cloudflare.
  Required variables include Gemini, Neon/Auth, database URLs, and the new Cloudflare R2 values.

- Decide how to handle `next/font` in production builds.
  Recent local builds needed network access to fetch Google Fonts. If deploy environments are locked down, switch to committed/local fonts or make font fetching predictable.

- Verify `npm run build:deploy`.
  It currently runs `npm run db:init` before `next build`, so production deploys depend on correct database owner/app role configuration.

- Add a deployment checklist.
  Include env vars, database init, R2 bucket/public URL, auth callback domains, and smoke test paths.

## P1: R2 Storage Integration

The R2 utility exists in `src/lib/storage/r2.ts`, but product flows still need to use it.

- Connect R2 to source intake.
  Uploaded source files are currently read into browser/client state and then posted as text. R2 should store original files when file retention or large uploads matter.

- Decide source privacy and retention.
  The app currently stores raw source text in `source_items`. We should decide whether originals, extracted text, or both should be persisted.

- Add R2-backed export storage.
  PDF/PNG/JPG export currently downloads from the browser. A server-side export job could write final artifacts to R2 and return a durable download URL.

- Define object namespaces.
  Keep keys predictable: `projects/{projectId}/sources/...`, `projects/{projectId}/exports/...`, and later `projects/{projectId}/assets/...`.

- Add route-level integration tests around R2 config failures.
  `r2.test.ts` covers helpers, but product routes should fail with clear messages when env vars are missing.

## P1: Source Intake

This is directly tied to generation quality.

- Implement PDF extraction.
  `source-ingestion.ts` explicitly marks PDF as `extraction_required`. This is a common user input and should become first-class.

- Move heavy extraction server-side.
  DOCX extraction is currently triggered from the client-side source flow through `mammoth`. Server-side extraction will be more consistent and easier to pair with R2.

- Add source size strategy.
  Long sources are sliced before prompting. We need a clear chunking/summarization strategy so important sections are not silently discarded.

- Improve source review UI.
  Users should see extracted character count, per-file status, and enough preview to catch bad extraction before generation.

## P1: Generation Reliability

The blueprint to document split is the right direction, but we still need better recovery.

- Add page-level repair before failing the whole generation.
  If one page fails validation, repair only that page and keep the successful document structure.

- Store richer invalid document diagnostics.
  We should preserve page id, failing selector, CSS issue, manifest issue, and model stage in `ebook_generation_logs.validation`.

- Track generation quality telemetry.
  Store slide count, source length, recommended slide count, validation errors, repair count, and whether the user edited/exported.

- Continue prompt QA against real documents.
  The next tests should use Korean PDF/DOCX/source-heavy examples, not just synthetic unit cases.

- Make model and temperature settings configurable.
  Keep defaults conservative, but allow controlled experiments without code edits.

## P1: Editor Stability

The editor works, but it still has product-risky areas.

- Split `EditorShell` further.
  It still owns iframe lifecycle, selection, edit application, export, and layout. The next split should isolate export and iframe click handling.

- Improve selection reliability.
  Iframe click selection depends on generated HTML, manifest selectors, and runtime text indexes. Add more tests around nested text, duplicate text, and shape overlays.

- Replace CSS append-only style edits.
  `appendScopedStyleToDocument` appends new rules. Over time this can stack conflicting rules. We need rule merge/update behavior by element and property.

- Sync inspector controls with actual selected styles.
  Inputs currently apply values but do not show the current computed/document value. This makes repeat editing clumsy.

- Add undo/version history.
  Page-level document versions exist, but the UI does not expose undo or change history yet.

- Decide when to remove `/builder/[projectId]`.
  It is currently a compatibility redirect. Keep it until old links no longer matter.

## P1: Export

Export is still browser-heavy.

- Move PDF export toward a server-side job.
  Client-side `html2canvas` plus `jspdf` is convenient but fragile for large ebooks and font/image fidelity.

- Add export progress and cancellation.
  Multi-page PNG/JPG export loops through pages with little user feedback.

- Store final export artifacts.
  R2 can make export links durable instead of one-time browser downloads.

- Add export QA.
  Test multi-page output, page boundaries, selected element cleanup, Korean text, and image/CORS behavior.

## P2: Auth And Accounts

Neon Auth is connected, but we should harden the user experience.

- Verify production auth callbacks.
  Check Vercel/Cloudflare domains, local dev, and preview deployment URLs.

- Add clear unauthenticated and expired-session states.
  Dashboard/editor routes should fail gently and consistently.

- Decide account settings scope.
  The sidebar has settings/navigation concepts, but the product does not yet have a complete settings surface.

## P2: Dashboard And Product Copy

The UI still carries old "draft/manuscript" language in places.

- Rename remaining product copy around ebooks/publications.
  Avoid confusing users with "draft" or "manuscript" if the app is now an ebook editor.

- Add project lifecycle states.
  `ProjectStatus` includes `processing_sources`, `planning`, `generating`, `ready`, and `exported`, but the UI mostly behaves like a simple list.

- Add empty/error/loading QA.
  Dashboard and wizard should be tested under no DB, no auth, failed generation, and missing R2 env scenarios.

## P2: Data Model Cleanup

Some compatibility fields remain intentionally.

- Keep `ebook_html` for now.
  It is still useful as compiled cache and legacy fallback.

- Revisit `project_type`.
  It is constrained to `product`, so it may eventually be removable if there is no multi-product roadmap.

- Add explicit schema migration docs.
  `applyAppSchema` is bootstrap-style. As the product grows, one-way migrations should be easier to review and reason about.

## P2: Testing And CI

The unit suite is good, but we need broader confidence.

- Add browser QA for the editor.
  Cover page selection, scrolling, text edit, style edit, export menu, and generated document preview.

- Add route-level tests for generate/save.
  Current tests cover helpers heavily. API behavior with auth/session/database failures needs more coverage.

- Add visual regression checks for editor page boundaries.
  We have repeatedly seen page gap/boundary issues. This deserves screenshot-based coverage.

- Simplify the unit test script.
  `test:unit` is a long chained command. A small test runner script would be easier to maintain.

## P3: Later Product Expansion

These are not immediate blockers, but they are natural next product bets.

- AI page repair and redesign commands.
  Use patch operations against one page instead of regenerating the whole ebook.

- Template/theme system.
  Save strong generated page systems as reusable templates or brand presets.

- Asset-aware pages.
  R2-backed images can allow generated pages to reference uploaded or generated assets safely.

- Share links.
  Export is useful, but web preview/share links would make Celion feel more like a publishing product.

## Suggested Next Batch

Start with a narrow, valuable batch:

1. Connect R2 to source upload metadata and server-side source persistence.
2. Add PDF extraction.
3. Add page-level repair for invalid generated documents.
4. Add browser QA for editor page gaps, selection, and text editing.
5. Clean up remaining product copy around drafts/manuscripts.

This sequence improves reliability before adding larger editor features.
