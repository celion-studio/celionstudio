# TiptapPlus open-source inventory

Date: 2026-04-25

Purpose: inventory the useful open/public TiptapPlus ecosystem pieces and decide what Celion can adopt, vendor, or use as implementation reference.

## Scope checked

Official site:

- https://tiptapplus.com/pagination-plus/
- https://tiptapplus.com/pagination-plus/install/
- https://tiptapplus.com/pagination-plus/commands
- https://tiptapplus.com/pagination-plus/page-size/
- https://tiptapplus.com/pagination-plus/page-print/
- https://tiptapplus.com/table-plus/
- https://tiptapplus.com/table-plus/pagination/
- https://tiptapplus.com/image-plus/
- https://tiptapplus.com/image-plus/install/

Public packages:

- `tiptap-pagination-plus@3.0.6`
- `tiptap-table-plus@3.1.0`
- `tiptap-image-plus@3.0.1`
- `tiptap-utility@3.0.1`

Installed in Celion now:

- none of these packages.

Not installed:

- `tiptap-pagination-plus`
- `tiptap-table-plus`
- `tiptap-image-plus`
- `tiptap-utility` because the useful parts are small helper patterns that are better rewritten locally when needed.

GitHub repositories:

- https://github.com/RomikMakavana/tiptap-pagination-plus
- https://github.com/RomikMakavana/tiptap-table-plus
- https://github.com/RomikMakavana/tiptap-image-plus
- https://github.com/RomikMakavana/tiptap-utility

Important: `tiptapplus.com` explicitly says it is not an official Tiptap website and has no business affiliation with Tiptap.

## Package inventory

| Package | Version | License metadata | Tiptap v3 fit | Tarball contents | Usefulness for Celion | Call |
| --- | --- | --- | --- | --- | --- | --- |
| `tiptap-pagination-plus` | `3.0.6` | MIT | Yes. Peer deps allow `@tiptap/core` and `@tiptap/pm` v2 or v3 | `dist`, README, package metadata; no standalone LICENSE file in tarball | Page format, margins, visual page gap, header/footer, page number variables, page-size commands | Highest priority |
| `tiptap-table-plus` | `3.1.0` | MIT | Yes. Peer deps target Tiptap v3 table packages | `dist`, README, package metadata; no standalone LICENSE file in tarball | Duplicate row/column, page-aware table grouping, table resize support | High priority once tables matter |
| `tiptap-image-plus` | `3.0.1` | MIT | Yes. Peer deps allow Tiptap image v2 or v3 | `dist`, README, package metadata; no standalone LICENSE file in tarball | Image resize handles, align controls, wrapper/container styles | Medium-high priority |
| `tiptap-utility` | `3.0.1` | ISC | Yes. Peer deps allow Tiptap core v2 or v3 | `dist`, README, package metadata; no standalone LICENSE file in tarball | Small ProseMirror/Tiptap traversal helpers | Low priority; copy tiny helper ideas only |

## Best pieces to bring into Celion

### 1. Pagination visual layer

Source: `tiptap-pagination-plus`

Take:

- page size constants: A4, A3, A5, Letter, Legal, Tabloid;
- page height/width/margin command shape;
- page gap and background CSS variable approach;
- header/footer page number replacement with `{page}` and `{total}`;
- DOM measurement utilities for header/footer height and page content height;
- page count recalculation strategy.

Do not take blindly:

- raw HTML header/footer rendering;
- browser print as the final export strategy;
- global/unscoped style injection;
- any assumption that visual editor pagination is equal to final PDF pagination.

Celion version should:

- scope everything under the Celion editor root;
- render header/footer as safe text or a tiny safe token model first;
- keep canonical content as normal Tiptap JSON;
- avoid introducing `page` nodes into saved content;
- add Playwright checks around Enter, page boundary click, image, and table behavior.

### 2. Table pagination and resize

Source: `tiptap-table-plus`

Take:

- `TableKitPlus` idea for a single Tiptap v3 table bundle;
- row grouping logic for `rowspan`;
- `TableRowGroup` concept for keeping related rows together;
- resize handle UX and column sizing logic;
- duplicate row/column commands.

Risks:

- table pagination is always more fragile than paragraph/image pagination;
- rowspan/colspan cases need explicit tests;
- PDF export may disagree with editor-side table grouping.

Celion version should start with:

- normal Tiptap table support;
- duplicate row/column;
- basic resize;
- only then page-aware row grouping.

### 3. Image resize and alignment

Source: `tiptap-image-plus`

Take:

- image NodeView structure;
- drag resize controller;
- left/center/right alignment controls;
- wrapper/container style separation;
- mobile-friendly control visibility.

Risks:

- low GitHub adoption signal;
- current Celion image upload/storage path should remain ours;
- image resizing must save stable attrs, not only DOM styles.

Celion version should store:

- `src`;
- `alt`;
- `title` if needed;
- `width`;
- `align`;
- optional `caption` only if we explicitly add a caption node/attribute.

### 4. Utility helpers

Source: `tiptap-utility`

Useful helper ideas:

- `getAllNodesOfType`;
- `getAllNodesByTypeAndAttrs`;
- `getNodesInRange`;
- `getFocusedNodeContainer`;
- `getWordCount`;
- `mapEachNode`;
- `filterEachNode`;
- mark lookup helpers.

Call:

- do not add the package just for these;
- copy/rewrite tiny helpers directly when needed;
- keep helper names Celion-specific if they become part of our codebase.

## What not to depend on

Do not treat `tiptapplus.com` as official Tiptap infrastructure.

Do not use the browser print feature as final ebook/PDF export. Their own docs list print limitations:

- custom headers/footers are not included in print output;
- `{page}` numbering from the extension does not appear in printed output;
- browser print settings can override margins;
- printed size may not match configured editor size.

For Celion, browser print can be a quick preview/debug tool, but export should remain a separate controlled pipeline.

## Tiptap vs TiptapPlus comparison

| Area | Official Tiptap OSS | Official Tiptap Pages / Pro | TiptapPlus packages | Celion direct implementation |
| --- | --- | --- | --- | --- |
| Cost | Free/open source | Paid/private registry, Team plan beta | Public npm packages, mostly MIT metadata | Free, owned by Celion |
| Vendor trust | Highest for editor core | Highest for page editor features | Community/individual | Ours |
| Pagination | No full page-layout system in OSS core | Strongest fit for page headers/footers/PageBreak | Good reference for visual pagination | Needs implementation |
| Saved document model | Normal Tiptap JSON | Official extension model | Mostly normal Tiptap JSON for Pagination Plus; table/image packages add extensions | We choose the model |
| Header/footer | Need custom implementation | Built in | Built in visually, but HTML APIs need care | Safe text/token model recommended |
| Tables | Official table extensions available | Pages table guides/kit available | Table Plus adds row grouping, resize, duplicate row/column | Use official tables first, add selected behavior |
| Images | Official Image extension available | Not the main differentiator | Image Plus adds resize/align NodeView | Implement resize/align NodeView locally |
| Export confidence | Needs separate export pipeline | Best chance of editor/export alignment | Browser print limitations documented | Needs controlled export pipeline |
| Product control | High | Medium-low due private package | Medium if installed, high if vendored | Highest |

Conclusion: use official Tiptap OSS as the foundation, use TiptapPlus as implementation reference, and avoid adding TiptapPlus runtime dependencies unless a short spike proves that a package is worth keeping.

## Direct implementation target

Celion should implement these features directly instead of depending on TiptapPlus at runtime:

```text
src/components/editor/pagination/
  page-sizes.ts
  pagination-plugin.ts
  page-chrome.ts
  header-footer.ts

src/components/editor/image/
  image-plus-extension.ts
  image-node-view.ts
  resize-controller.ts

src/components/editor/table/
  table-kit.ts
  duplicate-row.ts
  duplicate-column.ts
  table-pagination.ts
```

Implementation rules:

- Keep canonical data as normal Tiptap JSON.
- Do not store visual page wrappers as document nodes.
- Do not use raw `innerHTML` for header/footer.
- Store image sizing/alignment as stable node attributes.
- Start tables with official Tiptap table extensions, then add duplicate and row-group behavior.
- Treat final PDF/export as separate from browser/editor pagination.

## Adoption options

### Option A: Install packages now

Install:

```bash
npm install tiptap-pagination-plus tiptap-table-plus tiptap-image-plus
```

Pros:

- fastest spike;
- gets command APIs and behavior immediately;
- easiest to compare against their docs/examples.

Cons:

- unofficial dependency;
- package internals may not match Celion UX;
- header/footer HTML handling needs hardening;
- table/image behavior still needs our tests.

Use if we want speed first.

Status: not selected. The packages were inspected and then removed from runtime dependencies because Celion should be able to own the implementation directly.

### Option B: Vendor selected code

Copy only the small pieces Celion needs into:

```text
src/components/editor/pagination/
src/components/editor/table/
src/components/editor/image/
```

Pros:

- full control over UX, safety, and styling;
- can remove unwanted APIs;
- easier to keep canonical Tiptap JSON clean.

Cons:

- we own maintenance;
- must preserve MIT/ISC attribution where copied;
- initial integration takes longer.

Use if we want product fit first.

### Option C: Reference only, rewrite clean

Use their APIs and package shape as inspiration, but write Celion-specific pagination/image/table extensions.

Pros:

- cleanest long-term code;
- avoids importing untested assumptions;
- no accidental raw HTML/header/footer behavior.

Cons:

- slowest;
- pagination bugs become ours immediately.

Use if the package spike exposes too much friction.

## Recommended Celion path

1. Keep official Tiptap OSS packages as the runtime editor foundation.
2. Reimplement a Celion pagination layer using TiptapPlus as a reference.
3. Reimplement image resize/alignment locally using a Celion NodeView.
4. Add table duplicate row/column locally after official table support is stable.
5. Add row grouping/table pagination only after basic table editing works.
6. Do not add `tiptap-utility` as a dependency; rewrite small helpers when needed.
7. Add a `docs/third-party-notices.md` entry before copying any package code into `src/`.
8. Verify with these scenarios before committing to the approach:
   - empty page + Enter;
   - clicking blank page area;
   - long paragraph near page end;
   - image upload + resize + save + reload;
   - table crossing page boundary;
   - page size switch;
   - export path.

## Immediate implementation shortlist

Bring these first:

1. `PAGE_SIZES` values and Celion ebook default.
2. Page width/height/margin state and command model.
3. Visual page gap and page background CSS.
4. Footer `{page}` / `{total}` rendering as safe text.
5. Pagination plugin that measures block positions without mutating the document schema.
6. Image resize NodeView pattern.
7. Table duplicate row/column commands.
8. Table row grouping only after basic table editing is stable.

## Notes from package inspection

- All four packages are small enough to inspect manually.
- The npm tarballs include built `dist` files and README/package metadata.
- None of the inspected tarballs included a standalone LICENSE file, even when package metadata says MIT.
- If we copy code rather than import packages, keep attribution in source headers or `docs/third-party-notices.md`.
- The packages have placeholder/no-op test scripts, so Celion must supply the confidence through its own tests.
