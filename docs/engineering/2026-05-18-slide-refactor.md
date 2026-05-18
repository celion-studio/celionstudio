# Slide Refactor Engineering Note

Date: 2026-05-18

## Status

Celion's editor/document runtime has been shifted from page-oriented internals toward slide-oriented internals. This is an implementation bridge, not the full product repositioning yet.

The current code still supports legacy stored documents that use `pages`, but new normalized runtime data should use `slides`.

## What changed

### Runtime document model

- `CelionEbookPage` became `CelionSlide`.
- `CelionPageManifest` became `CelionSlideManifest`.
- Document content now normalizes to `slides: CelionSlide[]`.
- Legacy persisted `pages: [...]` is still accepted by normalization and project profile loading.

### DOM contract

- Runtime/editable slide roots now use `data-celion-slide`.
- Editor selectors and scoped CSS now target `[data-celion-slide="..."]`.
- Existing `.slide` class remains the visual slide container class.

### Editor naming

- `pageId`, `pageIndex`, and `pageCount` were moved toward `slideId`, `slideIndex`, and `slideCount` in active editor/generation paths.
- `PageSummary` became `SlideSummary`.
- `EditorPageList` became `EditorSlideList`.
- Preview frame helpers now return `slides` from `.slide` nodes.

### Generation contract

- The Gemini HTML generation contract now asks for `document.slides` instead of `document.pages`.
- The model-facing DOM contract now specifies `data-celion-slide="{slideId}"`.
- Legacy generated/stored shapes with `pages` still normalize through the compatibility path.

## Compatibility rules

Keep these until an explicit migration removes legacy support:

1. `normalizeEbookDocument` must accept both `slides` and legacy `pages`.
2. `normalizeStoredEbookDocument` must accept both `slides` and legacy `pages`.
3. DB schema fields such as `ebook_document` remain unchanged for now.
4. API route names under `/api/ebook/*` remain unchanged for now.
5. Next.js `page.tsx` route files must not be renamed.

## Known intentional leftovers

These are not blockers for the current refactor:

- Product copy and pricing still mention ebooks/pages in several user-facing places.
- Historical docs under `docs/superpowers/` still describe the old page-level ebook plan.
- Some compatibility variables/functions may still mention `pages` when reading legacy payloads.
- Export remains PDF/image-oriented; PPTX export is not implemented yet.

## Follow-up work

1. Decide product language: ebook, slide publication, deck, or presentation.
2. Update user-facing copy and wizard labels after the product language decision.
3. Scope Moveable snapping to the current slide only.
4. Switch the default canvas from A5 portrait to the chosen slide aspect ratio if product strategy requires it.
5. Add PPTX export separately from the terminology refactor.
6. Plan a DB/document migration only after legacy compatibility is no longer needed.

## Verification for this refactor

Current checks pass:

```text
node .\node_modules\typescript\bin\tsc --noEmit
npm run test:unit
```
