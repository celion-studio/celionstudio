# Celion Visual Pagination Design

Date: 2026-04-25

## Purpose

Build Celion's own visual pagination layer for the editor.

The first success criterion is not print/PDF parity. The first success criterion is that the editing surface feels like a stable page-based document while preserving one canonical Tiptap/ProseMirror document.

## Decision

Celion will not add TiptapPlus packages as runtime dependencies for pagination.

TiptapPlus remains a reference for behavior, option shape, edge cases, and implementation ideas. Celion owns the ProseMirror plugin, page chrome, measurement, and document integration.

## Product Goal

The editor should feel like a document editor with visible pages:

- A visible page frame with header and footer.
- Page gaps that make boundaries obvious.
- Page numbers rendered from safe text tokens.
- Page count recalculated after edits and page-format changes.
- Large block content moved visually to the next page when it no longer fits.

Line-accurate pagination and export/PDF fidelity are explicitly outside this first phase.

## Architecture

The saved document remains a normal Tiptap/ProseMirror document.

```text
Tiptap useEditor()
  -> ProseMirror EditorView
    -> CelionPaginationPlugin
      -> measure top-level block DOM
      -> compute visual page breaks
      -> render decorations for page chrome and page gaps
      -> report visual page count
```

The plugin must not insert page nodes, page-break nodes, header nodes, or footer nodes into the saved document.

The existing `tiptap-book` wrapper can remain as a compatibility envelope, but active editing should continue to flatten content into one editable `doc`.

## Proposed File Boundaries

Keep `src/components/editor/CelionPaginationExtension.ts` as the Tiptap extension wrapper.

Move implementation details into focused modules:

- `src/components/editor/pagination/pagination-types.ts`
  - Shared option and state types.
- `src/components/editor/pagination/page-breaks.ts`
  - Pure page-break calculation from measured block boxes.
- `src/components/editor/pagination/page-measurement.ts`
  - DOM measurement for top-level ProseMirror blocks.
- `src/components/editor/pagination/page-chrome.ts`
  - Decoration widget DOM for header, footer, page gap, and page numbers.
- `src/components/editor/pagination/pagination-plugin.ts`
  - ProseMirror plugin creation, scheduling, state updates, and decoration wiring.

## Behavior Rules

The first implementation should follow these rules:

- Render first-page header/footer even for an empty document.
- Compute page body area from page height, page padding, header height, and footer height.
- Measure top-level ProseMirror blocks, not individual text lines.
- Insert visual page breaks before a top-level block if that block would overflow the current page body and does not already start at the top of that body.
- If a single block is taller than a page body, allow it to span visually rather than trying to split it.
- Keep header/footer text safe: render with `textContent`, not raw HTML.
- Support `{page}` and `{total}` tokens in footer text.
- Report visual page count through the existing `onPageCountChange` callback.
- Recalculate after document changes, page-format changes, and layout option changes.

## Non-Goals

This phase will not implement:

- Line-level paragraph splitting.
- Table pagination.
- PDF/export parity.
- Saved page nodes.
- Manual page-break authoring.
- Rich header/footer HTML.
- Collaboration/history behavior.

## Testing Strategy

Use unit tests for the pure page-break calculation before touching browser behavior.

Add focused tests for:

- Empty document produces one page.
- Content that fits produces no break.
- A block that overflows near the bottom produces one break before that block.
- A block that starts at the top and is taller than a page does not produce an infinite break loop.
- Multiple overflowing blocks produce stable page numbers.
- Footer token rendering replaces `{page}` and `{total}`.

Manual browser QA remains required for:

- Empty editor page frame.
- Typing through page boundaries.
- Headings and lists near page bottom.
- Image near page bottom.
- `mediaText` near page bottom.
- Page-format switching.
- Header/footer double-click editing.

## Success Criteria

The phase is complete when:

- Editor pagination code is split into focused modules.
- The saved document JSON remains free of pagination nodes.
- The page frame, header, footer, gap, and page count remain stable while editing.
- Unit tests cover the pure break calculation and footer token rendering.
- Existing unit tests and typecheck pass.

## Open Follow-Up

After this phase, decide whether the next investment is:

- Better editor QA around images and `mediaText`.
- Manual page-break controls.
- Object storage for images.
- A controlled PDF export pipeline.
