# 2026-05-01 Editor Cleanup Notes

## Summary

Celion was simplified around one product surface: the ebook editor.

The old Tiptap document editor was removed, the page-level ebook document model became the editable source of truth, and the previous `builder` naming was replaced with `editor` in routes, components, tests, and docs.

## Product Flow

- `/new` creates an ebook project.
- Generation writes both `ebook_document` and compiled `ebook_html`.
- `/editor/[projectId]` opens the editable ebook surface.
- `/builder/[projectId]` exists only as a legacy redirect to `/editor/[projectId]`.
- `/dashboard` links directly to `/editor/[projectId]`.

## Data Model

Kept:

- `projects.project_type`, normalized to `product`.
- `project_profiles.ebook_document`, the page-level source model.
- `project_profiles.ebook_html`, the compiled cache used by preview/export compatibility paths.
- `ebook_generation_logs`, including stage, blueprint, validation, and error details.

Removed from active app contract:

- `ProjectKind = "document"`.
- `ProjectProfile.document`.
- `ProjectProfile.plan`.
- `page_format`, `page_width_mm`, and `page_height_mm` profile fields.
- Tiptap document backfill and reclassification migrations.

Schema bootstrap now drops legacy profile columns (`plan`, `document`, `blocks`, `page_format`, `page_width_mm`, `page_height_mm`) and constrains `project_type` to `product`.

## Code Cleanup

Removed:

- Old document routes: `/documents`, `/editor/[projectId]` Tiptap implementation.
- Old Tiptap editor components and pagination helpers.
- Old document validation, document generation, prompts, image storage, and legacy block utilities.
- Tiptap and Vercel Blob dependencies.
- Obsolete Tiptap research and plan docs.

Renamed:

- `src/components/builder/*` to `src/components/editor/*`.
- `BuilderShell` to `EditorShell`.
- `builder-preview*` to `editor-preview*`.
- `builder-document-edits*` to `editor-document-edits*`.
- `use-builder-*` hooks to `use-editor-*`.

## Current Editor Architecture

- `src/lib/ebook-document.ts` defines the page-level ebook document contract.
- `src/lib/ebook-generation.ts` creates the blueprint first, then asks Gemini Pro for a complete page-level document JSON.
- `src/app/api/ebook/save/route.ts` accepts either legacy HTML or the current document payload.
- `src/components/editor/EditorShell.tsx` loads `ebook_document` first and falls back to compiled HTML.
- Editor helpers are split into preview, iframe preparation, document edits, save state, selection state, and inspector controls.

## Verification

Completed after cleanup:

- `node node_modules\typescript\bin\tsc --noEmit`
- `npm run test:unit`
- `npm run build`
- `git diff --check`
- Runtime reference search for removed terms:
  - `components/builder`
  - `BuilderShell`
  - `normalizeBuilderHtml`
  - `Tiptap`
  - `@tiptap`
  - `@vercel/blob`
  - `page-format`
  - `ProjectDocumentPayload`
  - `ProjectKind = "document"`

Notes:

- `npm run test:unit` needed to run outside the sandbox because `tsx`/esbuild hit `spawn EPERM`.
- `npm run build` needed network access because `next/font` fetched Google Fonts.

## Follow-Up

- Decide when to remove the `/builder/[projectId]` redirect.
- Consider renaming any user-facing copy that still says "draft" or "manuscript" if the product should present itself only as an ebook editor.
- Keep `ebook_html` until export and legacy fallback no longer need the compiled cache.
