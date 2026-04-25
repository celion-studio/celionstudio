# Tiptap pagination research

Date: 2026-04-25

Purpose: collect practical pagination/page-editor options for Celion's ebook editor, with an emphasis on free or open-source options we can inspect, adapt, or vendor safely.

## Current direction

Celion should keep the canonical document as normal Tiptap JSON. Pagination should be a rendering/editing layer over the document, not the source of truth.

That means:

- Prefer visual pagination implemented with decorations, CSS variables, measurements, and print/export styles.
- Avoid making `page`, `body`, `header`, or `footer` nodes mandatory in the saved document unless there is no other reliable path.
- Treat page breaks, page numbers, header/footer chrome, and page-size preview as editor presentation concerns first.
- Keep PDF/export fidelity as a separate verification track. Browser editor pagination and final PDF pagination can drift.

## Recommendation

Primary path: build Celion's own pagination layer on top of official Tiptap OSS, using `tiptap-pagination-plus` as a reference instead of a runtime dependency.

Best shape for Celion:

1. Build a small Celion pagination layer around Tiptap.
2. Reuse official Tiptap OSS packages for normal document editing.
3. Use TiptapPlus packages as readable reference material for page sizing, header/footer, image resizing, and table utilities.
4. Do not add TiptapPlus packages as permanent runtime dependencies unless a focused spike proves one is worth keeping.
5. Sanitize or replace any HTML-based header/footer idea before user/AI content reaches it.
6. Keep official Tiptap Pages as a paid upgrade path later.

## Candidate table

| Candidate | Free or paid | Official? | Tiptap fit | Architecture | Useful parts | Risks | Celion call |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tiptap-pagination-plus` | Free, MIT, public npm/GitHub | No | Supports Tiptap v2 and v3; latest points to v3 | Visual pagination using DOM measurement, page gap/header/footer widgets, commands, CSS | Page sizes, margins, `{page}` variables, header/footer, table companion package | Unofficial, browser-only, header/footer examples accept HTML, no strong test signal | Best free reference; do not depend by default |
| `tiptap-table-plus` | Free, MIT, public npm/GitHub | No | Tiptap v3 table companion for `pagination-plus` | Custom table extensions for page-aware table splitting | Table pagination, repeated headers, resize pagination | Extra dependency, needs separate QA | Consider only when table pagination becomes a real requirement |
| `hugs7/tiptap-extension-pagination` | Public package; repo says MIT, npm metadata says ISC | No | Tiptap v2 peer deps | Real `page`, `body`, `header-footer` nodes inside the document | Good reference for page node/keymap/header-footer ideas | Changes document schema, v2-oriented, repaginates by replacing doc content, license metadata mismatch | Do not use as primary; reference only |
| Official Tiptap Pages / PageKit | Paid/private registry; Team plan beta | Yes | Tiptap official Pages product | Official page layout extension with page format, headers/footers, PageBreak, table guides | Best vendor-aligned path; closer to the Tiptap demo we liked | Paid plan, private registry, beta, vendor lock-in | Future upgrade if Celion needs production-grade page editor support |
| `@adalat-ai/page-extension` | Free, MIT | No | Community Tiptap pages package | Page-node style pagination | Possible implementation reference | Lower adoption; page-node model conflicts with our direction | Low priority |
| `tiptap-community-pages` | Free, MIT | No | Tiptap v3 | Flat doc plus visual pages/print CSS | More aligned with flat document model | Smaller ecosystem, weaker header/footer story | Possible fallback/reference |
| `tiptap-pagination-breaks` | Free, MIT | No | Community package | Lightweight page breaks/page numbering | Small, easier to inspect | Limited rich page editing | Reference only |
| `prosemirror-pagination` | Free/community | No | Raw ProseMirror, older | Pagination ideas at ProseMirror layer | Historical reference | Not Tiptap-ready, likely stale | Avoid unless debugging a specific algorithm |

## Direct answers

### Is `hugs7/tiptap-extension-pagination` Tiptap Pro?

No. `hugs7/tiptap-extension-pagination` is not Tiptap Pro.

Evidence:

- GitHub repo is public: https://github.com/hugs7/tiptap-extension-pagination
- Install command is normal npm: `npm install tiptap-extension-pagination`
- It is not under `@tiptap-pro/*`.
- It does not require Tiptap private registry access.

But it is not a good first choice for Celion right now.

Reasons:

- It targets Tiptap v2 peers: `@tiptap/core ^2.11.5`, `@tiptap/pm ^2.11.5`.
- Its model adds real page/body/header-footer nodes to the document.
- It measures DOM and rebuilds/replaces document content to paginate.
- Repo license is shown as MIT, but npm/package metadata says ISC. That is probably harmless, but should be clarified before commercial use.

Verdict: free/public, not Pro, but use as a reference rather than installing.

### What is `tiptapplus.com/pagination-plus`?

`tiptapplus.com/pagination-plus` documents the `tiptap-pagination-plus` package.

It is not official Tiptap. The site explicitly says it has no business affiliation with Tiptap.

Useful features:

- Automatic page breaks based on content height.
- Page numbers in header/footer.
- `{page}` variable support.
- Custom header/footer text, multiline content, and HTML examples.
- Predefined page sizes and custom dimensions.
- Commands for dynamic pagination settings.
- Table pagination when paired with `tiptap-table-plus`.

Why it is interesting for Celion:

- It supports Tiptap v3.
- It appears to keep pagination more visual instead of forcing saved content into page nodes.
- It is much closer to our desired "document editor with page preview" direction.

Risks:

- It is unofficial and appears to be maintained by an individual/community.
- It is browser-layout-dependent, so PDF/export must be verified separately.
- Header/footer HTML support must be treated carefully. We should render safe text or sanitized DOM instead of passing arbitrary user/AI HTML.
- Table pagination needs a companion package and dedicated tests.

Verdict: best free reference. Celion should implement the needed pieces directly first; install it only for a temporary comparison spike if needed.

## Official Tiptap Pages note

The official Tiptap Pages extension is different from both community packages.

Tiptap's docs say Pages is available in Team plan beta and installed from the private/pro package:

```bash
npm install @tiptap-pro/extension-pages@1.0.0-alpha.16.2
```

So the polished demo behavior we liked is probably backed by the paid/pro Pages stack, not only free OSS extensions.

This does not block Celion. It just means the free path should be:

- official Tiptap OSS as the editor foundation;
- a small custom pagination layer inspired by TiptapPlus and Pro Pages concepts.

## Suggested implementation plan

1. Create `src/components/editor/pagination/CelionPagination.ts`.
2. Keep the Tiptap schema normal. Do not introduce mandatory `page` nodes.
3. Render page boundaries, gap, footer, and page number as visual decorations/chrome.
4. Add page format settings: ebook default, A4, A5, Letter, custom width/height/margins.
5. Add safe header/footer rendering:
   - support `{page}` and `{total}`;
   - render plain text or a tiny safe token model first;
   - avoid raw `innerHTML` from user/AI input.
6. Add table/image stress tests before making it the default:
   - empty document + Enter;
   - clicking blank page area;
   - long paragraphs;
   - headings near page boundary;
   - large image;
   - table crossing page boundary;
   - Korean and English mixed text;
   - export/print preview.
7. Add direct image resize/alignment NodeView based on Celion attrs, not package DOM state.
8. Add official Tiptap table support first, then copy/rewrite duplicate row/column and row grouping ideas.
9. Add third-party attribution if code is copied or substantially adapted from MIT packages.

## Sources

- `hugs7/tiptap-extension-pagination`: https://github.com/hugs7/tiptap-extension-pagination
- npm `tiptap-extension-pagination`: https://www.npmjs.com/package/tiptap-extension-pagination
- `tiptap-pagination-plus` docs: https://tiptapplus.com/pagination-plus/
- `RomikMakavana/tiptap-pagination-plus`: https://github.com/RomikMakavana/tiptap-pagination-plus
- npm `tiptap-pagination-plus`: https://www.npmjs.com/package/tiptap-pagination-plus
- Official Tiptap Pages install docs: https://tiptap.dev/docs/pages/getting-started/install
- Tiptap pricing / OSS note: https://tiptap.dev/pricing
