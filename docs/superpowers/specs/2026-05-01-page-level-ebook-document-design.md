# Page-Level Ebook Document Design

## Goal

Celion should stop treating an AI ebook as one fragile HTML string. The target model is a page-level controlled HTML document: AI keeps the freedom to design expressive HTML/CSS pages, while Celion stores, validates, edits, and exports those pages through stable project data.

## Status

Implemented on 2026-05-01.

- `CelionEbookDocument` is now the editable source of truth for generated ebooks.
- `ebook_html` remains as the compiled compatibility cache for preview and export.
- The product surface is named editor in code and routing: `/editor/[projectId]`.
- `/builder/[projectId]` remains only as a legacy redirect to `/editor/[projectId]`.
- The old Tiptap document editor, document project kind, and related legacy DB compatibility paths were removed.

The important constraint is cost. The default generation path should stay at two LLM calls:

1. Flash-Lite creates the editorial blueprint and page plan.
2. Gemini Pro creates the complete page-level document JSON.

Per-page LLM calls are reserved for repair, redesign, or user-requested AI edits after the first document exists.

## Current Context

The current ebook flow has a two-step generation path in `src/lib/ebook-generation.ts`: blueprint first, then page-level document JSON from the blueprint. Project storage writes `project_profiles.ebook_document` as the source model and `project_profiles.ebook_html` as the compiled cache. The editor loads `ebook_document` first, falls back to `ebook_html` for legacy projects, renders in an iframe, lets the user click editable text, applies scoped document patches, recompiles HTML, and saves through `/api/ebook/save`.

The legacy single-HTML path worked for simple text edits, but it was risky for a real editor:

- one global HTML/CSS document means one bad selector can affect every page
- DOM selection depends on generated structure and `data-text-editable`
- style editing would require unsafe string or DOM surgery
- validation can only reason about the compiled document, not page ownership
- future AI edits would be tempted to regenerate the entire ebook

## Recommended Architecture

Use a page-level document as the source of truth while keeping `ebook_html` as a compiled compatibility cache.

```ts
type CelionEbookDocument = {
  version: 1;
  size: {
    width: number;
    height: number;
    unit: "px";
  };
  title: string;
  themeCss: string;
  pages: CelionEbookPage[];
};

type CelionEbookPage = {
  id: string;
  index: number;
  title: string;
  role: string;
  html: string;
  css: string;
  manifest: CelionPageManifest;
  validation?: CelionPageValidation;
  version: number;
};

type CelionPageManifest = {
  editableElements: CelionEditableElement[];
};

type CelionEditableElement = {
  id: string;
  role: string;
  type: "text" | "shape" | "image" | "container";
  selector: string;
  label: string;
  editableProps: CelionEditableProp[];
  maxLength?: number;
};

type CelionEditableProp =
  | "text"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "textAlign"
  | "color"
  | "backgroundColor"
  | "opacity"
  | "borderColor"
  | "borderWidth"
  | "borderRadius"
  | "margin"
  | "padding";
```

The database can add `project_profiles.ebook_document jsonb` later. During migration, new generation writes both:

- `ebook_document`: source of truth for editor editing
- `ebook_html`: compiled full HTML for existing preview/export/save compatibility

## Generation Flow

The existing two-call shape should remain.

```txt
Wizard input + sources
  -> Flash-Lite blueprint/page plan
  -> Gemini Pro page-level document JSON
  -> sanitize and validate per page
  -> compile pages into ebook_html
  -> save ebook_document + ebook_html
```

The second prompt should no longer ask for a single complete HTML document. It should ask for JSON:

```json
{
  "document": {
    "version": 1,
    "size": { "width": 559, "height": 794, "unit": "px" },
    "title": "string",
    "themeCss": "string",
    "pages": [
      {
        "id": "cover",
        "index": 0,
        "title": "string",
        "role": "cover",
        "html": "<section data-celion-page=\"cover\" class=\"celion-page\">...</section>",
        "css": "[data-celion-page=\"cover\"] { ... }",
        "manifest": { "editableElements": [] },
        "version": 1
      }
    ]
  }
}
```

Every page root must be:

```html
<section data-celion-page="page-id" class="celion-page">
```

Every editable element must have:

```html
data-celion-id="stable-id"
data-role="title"
data-editable="text"
```

## CSS Scoping

Every page CSS selector must be scoped to its page:

```css
[data-celion-page="page-01"] .title { ... }
```

Global selectors are invalid in page CSS:

```css
body
html
*
h1
p
.title
```

Shared export/preview rules belong in compiler-owned CSS, not AI page CSS. Page CSS should not define app-level iframe or body styles.

## Validation

Validation should run on both the page document and the compiled HTML.

Page document validation:

- each page has a unique `id`
- each page root has matching `data-celion-page`
- every `data-celion-id` is unique within the page
- every manifest selector resolves inside the page
- every editable element in HTML appears in the manifest
- forbidden tags are absent: `script`, `iframe`, `object`, `embed`, `form`, `input`, `textarea`, `button`, `video`, `audio`
- event handler attributes are absent
- CSS selectors are page-scoped
- page CSS does not use `position: fixed`, animations, external `url()`, or extreme values

Compiled HTML validation:

- slide count matches document page count
- each compiled `.slide` is exactly 559px by 794px
- visible text length is above the existing threshold
- placeholder headings like `Prologue 1`, `The Core Idea 2`, and `Chapter 1` are rejected

## Editor Editing Model

The editor should eventually read `ebook_document` first. If a legacy project only has `ebook_html`, Celion can compile a best-effort document by splitting `.slide` nodes and creating minimal manifests.

Selection flow:

```txt
click iframe element
  -> find closest [data-celion-id]
  -> find manifest entry
  -> show inspector controls for editableProps
  -> apply local patch
  -> validate page
  -> compile document to html cache
  -> save document + html cache
```

Inspector MVP:

- text content
- font size
- font weight
- alignment
- text color
- background color
- opacity
- border color
- border width
- border radius
- margin
- padding

The first implementation should not include free dragging, resizing, layer panels, direct raw HTML editing, or full Canva-style layout editing.

## AI Patch Model

Default generation remains two calls. Later AI edits should be page-scoped.

Examples:

- "make this cover more premium" calls the model with the selected page only
- "tighten this headline" can call the model with selected element context only
- failed validation repairs only the invalid page

AI patch output should be operations, not a full ebook:

```json
{
  "operations": [
    {
      "type": "replaceText",
      "targetId": "cover-title",
      "value": "The Creator OS"
    },
    {
      "type": "updateStyle",
      "targetId": "cover-title",
      "props": {
        "fontSize": "72px",
        "letterSpacing": "-0.04em"
      }
    }
  ]
}
```

Celion applies the patch, validates the page, then recompiles `ebook_html`.

## Compiler

Add a compiler layer:

```ts
compileEbookDocumentToHtml(document: CelionEbookDocument): string
```

The compiler owns:

- `<!doctype html>`
- `<html>`, `<head>`, and `<body>`
- print CSS
- preview/export-safe base CSS
- page order
- wrapping each page as `.slide`
- injecting `themeCss`
- injecting each page CSS

AI owns only page body HTML, page-scoped CSS, and manifest.

## Migration Plan

1. Define types and pure helpers for document validation and compilation.
2. Add tests that compile a small document into valid Celion slide HTML.
3. Change generation output shape from single HTML to page-level document JSON while still saving compiled `ebook_html`.
4. Add `ebook_document` to project profile storage.
5. Update editor to load `ebook_document` when present and fall back to `ebook_html`.
6. Replace the current text-only selector with manifest-based selection.
7. Add inspector controls incrementally.

## Non-Goals

This phase does not build:

- page-by-page initial LLM generation
- freeform drag and resize
- complex layer tree editing
- collaborative editing
- raw code editor
- template marketplace
- web publishing or payments

## Implementation Defaults

- Page CSS may use CSS variables only when they are defined on the same `[data-celion-page="..."]` root or in compiler-owned `themeCss`.
- Legacy `ebook_html` to document conversion should be runtime-only at first. Do not persist converted legacy documents until the conversion quality is proven.
- Compiled `ebook_html` should update after every committed edit, not every keystroke. Text field changes stay local until the user applies them.
- Page repair should use Gemini Pro first for quality. A cheaper repair model can be evaluated after validation and patch telemetry exists.

## Approval Criteria

This design is ready to implement when these are accepted:

- default generation remains two LLM calls
- `ebook_document` becomes source of truth
- `ebook_html` remains compiled cache for compatibility
- CSS is scoped per page
- manifest drives selection and inspector controls
- AI repair and redesign are page-scoped optional calls
