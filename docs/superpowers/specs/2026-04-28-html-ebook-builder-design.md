# HTML/CSS Ebook Builder Design

**Date:** 2026-04-28  
**Status:** Approved

## Overview

Celion pivots from a TipTap document editor to an HTML/CSS-based ebook creator. The document editor is preserved at `/documents`. The new ebook builder flow is: wizard (planning + style selection) → AI generates a single HTML/CSS ebook → text-only editor → export as PDF/PNG/JPG.

---

## User Flow

```
/new (6-step wizard) → /builder/[projectId] (editor + preview + export)
```

---

## Wizard (6 Steps)

Located at `/new`. Replaces the existing 4-step wizard.

| Step | Name | Content |
|------|------|---------|
| 1 | **Basics** | Title, author, one-line description |
| 2 | **Style** | Style card selection (Minimal / Editorial / Neo Brutalism / Bold / Elegant) |
| 3 | **Format** | Page count (8–40p), paper size (A4 / Letter), accent color |
| 4 | **Source** | Reference material (paste text or URL) |
| 5 | **Outline** | AI generates chapter outline as JSON → user reviews/edits |
| 6 | **Generate** | AI generates full HTML/CSS ebook in single call → redirect to `/builder/[projectId]` |

### Style Prompts

Each style card has an embedded CSS design prompt that is appended to the AI generation request:

- **Minimal**: `"clean white space, Inter font, single accent color, generous margins, minimal decoration"`
- **Editorial**: `"magazine layout, strong typographic hierarchy, pull quotes, bold chapter headers, editorial grid"`
- **Neo Brutalism**: `"thick black borders, high contrast, Courier-style or monospace font, raw asymmetric grid, stark colors"`
- **Bold**: `"large impactful typography, vibrant color blocks, strong visual weight, modern sans-serif"`
- **Elegant**: `"serif fonts, refined spacing, subtle gradients, classic book feel, muted color palette"`

---

## AI Generation

### Step 5 — Outline Generation (1 LLM call)

Input to Gemini:
- Title, description, source content, page count, style name

Output (JSON):
```json
{
  "chapters": [
    { "title": "Chapter title", "summary": "Brief summary", "pageCount": 3 }
  ]
}
```

### Step 6 — Full Ebook Generation (1 LLM call)

Input to Gemini:
- All wizard inputs + confirmed outline + style prompt

Output: Single complete HTML document with `div.page` separators:

```html
<html>
<head>
<style>
  /* All CSS in one block — fonts, layout, colors, typography */
  .page { width: 794px; height: 1123px; /* A4 at 96dpi */ overflow: hidden; }
</style>
</head>
<body>
  <div class="page" data-page="1"><!-- cover --></div>
  <div class="page" data-page="2"><!-- chapter 1 --></div>
  <!-- ... -->
</body>
</html>
```

A4 page dimensions: 794×1123px at 96dpi. Letter: 816×1056px.

---

## Data Model

Add to existing `projects` table:

```typescript
ebookHtml: string | null    // full HTML string, null until generated
ebookStyle: string | null   // style name e.g. "minimal"
```

No per-page splitting in the database — the full HTML is stored as a single string.

---

## Builder (`/builder/[projectId]`)

### Layout

```
┌─────────────┬──────────────────────────┬─────────────────┐
│  Page List  │     A4 Preview           │  Text Edit      │
│  (thumbs)   │  (iframe: actual HTML)   │  Panel          │
│             │                          │                 │
│  [1] ████   │  ┌────────────────────┐  │  Selected text: │
│  [2] ████   │  │                    │  │  ┌───────────┐  │
│  [3] ████   │  │  div.page content  │  │  │ textarea  │  │
│             │  │  rendered live     │  │  └───────────┘  │
│  + page     │  │                    │  │                 │
│             │  └────────────────────┘  │  [Apply]        │
└─────────────┴──────────────────────────┴─────────────────┘
Top bar: [← Back] [Project title]  [Export ▼ PDF / PNG / JPG]
```

### Page List (left panel)
- Thumbnail per `div.page` rendered via html2canvas at small scale
- Click to scroll/navigate to that page in the preview
- Count shown (e.g. "3 / 12")

### Preview (center)
- Full HTML loaded in a sandboxed iframe
- Click on any text element → highlights it, populates right panel
- Page boundary shown visually (shadow between pages)

### Text Edit Panel (right)
- Shows the `textContent` of the clicked element
- Textarea for editing
- On Apply: find-and-replace the exact text in `ebookHtml` string, reload iframe
- Only text changes — no style/layout editing

### Export
- **PNG/JPG**: `document.querySelectorAll('.page')` → html2canvas each page → download as zip or individual files
- **PDF**: same capture → jsPDF, one page per canvas, single PDF download
- Export button opens a dropdown: PDF / PNG (all pages zip) / JPG (all pages zip)

---

## Tech Stack Additions

| Package | Purpose |
|---------|---------|
| `html2canvas` | Render DOM to canvas for PNG/JPG/PDF capture |
| `jspdf` | Assemble canvases into PDF |

Both are client-side only — no server changes needed.

---

## Routes

| Route | Purpose |
|-------|---------|
| `/new` | 6-step ebook wizard (replaces current wizard) |
| `/builder/[projectId]` | HTML ebook editor + preview + export |
| `/documents` | Preserved TipTap document editor (unchanged) |
| `/editor/[projectId]` | Preserved TipTap editor (unchanged) |

---

## Out of Scope (MVP)

- Page drag-to-reorder in builder
- AI re-generation of individual pages
- Template library / saved styles
- Hosted ebook URL sharing
- EPUB export
