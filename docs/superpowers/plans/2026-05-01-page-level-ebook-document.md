# Page-Level Ebook Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Status

Implemented on 2026-05-01.

The plan was completed and followed by a cleanup pass that removed the old Tiptap document editor, dropped the document project kind from the app contract, renamed the product surface from builder to editor, and kept `/builder/[projectId]` as a compatibility redirect.

**Goal:** Replace fragile single-HTML ebook editing with a page-level document model while keeping the default Gemini generation path at two LLM calls.

**Architecture:** Add `CelionEbookDocument` as the editable source of truth and keep `ebook_html` as a compiled cache for preview/export compatibility. Gemini Pro still designs the ebook as HTML/CSS, but returns `pages[]` with page-scoped CSS and manifests instead of one monolithic document.

**Tech Stack:** Next.js App Router, React, TypeScript, Neon Postgres, Node test runner, Gemini provider, iframe preview, existing `html2canvas`/`jspdf` export path.

---

## File Structure

- Create `src/lib/ebook-document.ts`
  - Types, normalization, page validation, document validation, and compilation to Celion slide HTML.
- Create `src/lib/ebook-document.test.ts`
  - Unit tests for scoped CSS rules, manifest validation, and compiler output.
- Modify `package.json`
  - Add `src/lib/ebook-document.test.ts` to `test:unit`.
- Modify `src/types/project.ts`
  - Add `ebookDocument` to `ProjectProfile`.
- Modify `src/lib/db/schema.ts`
  - Add `project_profiles.ebook_document jsonb`.
- Modify `src/lib/db/schema.test.ts`
  - Assert schema includes `ebook_document`.
- Modify `src/lib/projects.ts`
  - Read/write `ebook_document`, add helpers for saving document + compiled HTML.
- Modify `src/lib/projects.test.ts`
  - Cover project profile normalization with `ebookDocument`.
- Modify `src/lib/ebook-generation.ts`
  - Change Gemini Pro output from single HTML to page-level document JSON, then compile to HTML.
- Modify `src/lib/ebook-generation.test.ts`
  - Test diagnostics include document and compiled HTML remains valid.
- Modify `src/app/api/ebook/generate/route.ts`
  - Save both `ebookDocument` and compiled `ebookHtml`.
- Modify `src/app/api/ebook/save/route.ts`
  - Accept either legacy `html` or new `document`; validate and save both source document and compiled HTML.
- Modify `src/app/editor/[projectId]/page.tsx`
  - Pass `initialDocument` alongside `initialHtml`.
- Modify `src/components/editor/EditorShell.tsx`
  - Load document-first, select by manifest, edit text and styles through document patches, then compile/save.
- Create `src/components/editor/inspector-controls.tsx`
  - Small reusable controls for text, typography, appearance, and spacing.

---

### Task 1: Core Page-Level Document Model

**Files:**
- Create: `src/lib/ebook-document.ts`
- Create: `src/lib/ebook-document.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for document validation and compilation**

Create `src/lib/ebook-document.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  validateEbookDocument,
} from "./ebook-document";
import { validateCelionSlideHtml } from "./ebook-html";

const validDocument = {
  version: 1,
  title: "TOEFL Reading Guide",
  size: { width: 559, height: 794, unit: "px" },
  themeCss: "",
  pages: [
    {
      id: "cover",
      index: 0,
      title: "Cover",
      role: "cover",
      version: 1,
      html: `<section data-celion-page="cover" class="celion-page">
        <h1 data-celion-id="cover-title" data-role="title" data-editable="text">TOEFL Reading Guide</h1>
        <p data-celion-id="cover-subtitle" data-role="subtitle" data-editable="text">A practical guide for high scorers.</p>
      </section>`,
      css: `[data-celion-page="cover"] { width: 559px; height: 794px; overflow: hidden; }
        [data-celion-page="cover"] h1 { font-size: 48px; color: #111111; }
        [data-celion-page="cover"] p { font-size: 18px; color: #333333; }`,
      manifest: {
        editableElements: [
          {
            id: "cover-title",
            role: "title",
            type: "text",
            selector: `[data-celion-id="cover-title"]`,
            label: "Title",
            editableProps: ["text", "fontSize", "fontWeight", "textAlign", "color"],
            maxLength: 80,
          },
          {
            id: "cover-subtitle",
            role: "subtitle",
            type: "text",
            selector: `[data-celion-id="cover-subtitle"]`,
            label: "Subtitle",
            editableProps: ["text", "fontSize", "lineHeight", "color"],
            maxLength: 160,
          },
        ],
      },
    },
  ],
};

test("validateEbookDocument accepts scoped page HTML, CSS, and manifest", () => {
  const result = validateEbookDocument(validDocument);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("compileEbookDocumentToHtml produces valid Celion slide HTML", () => {
  const html = compileEbookDocumentToHtml(normalizeEbookDocument(validDocument));
  const result = validateCelionSlideHtml(html, {
    minSlides: 1,
    minVisibleTextLength: 40,
    allowGenericOutlineHeadings: true,
  });

  assert.equal(result.ok, true);
  assert.match(html, /class="slide celion-page-shell"/);
  assert.match(html, /data-slide="1"/);
  assert.match(html, /data-celion-page="cover"/);
});

test("validateEbookDocument rejects unscoped CSS selectors", () => {
  const bad = structuredClone(validDocument);
  bad.pages[0].css = `h1 { color: red; }`;

  const result = validateEbookDocument(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("unscoped CSS selector")));
});

test("validateEbookDocument rejects manifest entries missing from HTML", () => {
  const bad = structuredClone(validDocument);
  bad.pages[0].manifest.editableElements[0].selector = `[data-celion-id="missing"]`;

  const result = validateEbookDocument(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("manifest selector")));
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
node --import tsx src/lib/ebook-document.test.ts
```

Expected: FAIL because `src/lib/ebook-document.ts` does not exist.

- [ ] **Step 3: Implement the document model**

Create `src/lib/ebook-document.ts` with these exported contracts:

```ts
import { normalizeEbookHtmlSlideContract, sanitizeEbookHtmlForCanvas } from "./ebook-html";

export type CelionEditableProp =
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

export type CelionEditableElement = {
  id: string;
  role: string;
  type: "text" | "shape" | "image" | "container";
  selector: string;
  label: string;
  editableProps: CelionEditableProp[];
  maxLength?: number;
};

export type CelionPageManifest = {
  editableElements: CelionEditableElement[];
};

export type CelionEbookPage = {
  id: string;
  index: number;
  title: string;
  role: string;
  html: string;
  css: string;
  manifest: CelionPageManifest;
  version: number;
};

export type CelionEbookDocument = {
  version: 1;
  title: string;
  size: { width: number; height: number; unit: "px" };
  themeCss: string;
  pages: CelionEbookPage[];
};

export type EbookDocumentValidation = {
  ok: boolean;
  errors: string[];
};
```

Implement:

```ts
const FORBIDDEN_TAGS = /\<(script|iframe|object|embed|form|input|textarea|button|video|audio)\b/i;
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=/i;
const GLOBAL_SELECTOR = /(^|,)\s*(html|body|\*|h[1-6]|p|div|span|section)(\s|,|\{|$)/i;

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function normalizeEbookDocument(input: unknown): CelionEbookDocument {
  const record = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const size = typeof record.size === "object" && record.size !== null ? record.size as Record<string, unknown> : {};
  const pages = Array.isArray(record.pages) ? record.pages : [];

  return {
    version: 1,
    title: stringValue(record.title),
    size: {
      width: Number(size.width) || 559,
      height: Number(size.height) || 794,
      unit: "px",
    },
    themeCss: stringValue(record.themeCss),
    pages: pages.map((page, index) => {
      const p = typeof page === "object" && page !== null ? page as Record<string, unknown> : {};
      const manifest = typeof p.manifest === "object" && p.manifest !== null
        ? p.manifest as Record<string, unknown>
        : {};
      const editableElements = Array.isArray(manifest.editableElements)
        ? manifest.editableElements
        : [];

      return {
        id: stringValue(p.id, `page-${index + 1}`),
        index: Number(p.index) || index,
        title: stringValue(p.title, `Page ${index + 1}`),
        role: stringValue(p.role, index === 0 ? "cover" : "content"),
        html: stringValue(p.html),
        css: stringValue(p.css),
        version: Number(p.version) || 1,
        manifest: {
          editableElements: editableElements.map((item, itemIndex) => {
            const e = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
            const props = Array.isArray(e.editableProps) ? e.editableProps.filter((prop): prop is CelionEditableProp => typeof prop === "string") : [];
            const id = stringValue(e.id, `${stringValue(p.id, `page-${index + 1}`)}-editable-${itemIndex + 1}`);
            return {
              id,
              role: stringValue(e.role, "content"),
              type: (["text", "shape", "image", "container"].includes(stringValue(e.type)) ? e.type : "text") as CelionEditableElement["type"],
              selector: stringValue(e.selector, `[data-celion-id="${id}"]`),
              label: stringValue(e.label, id),
              editableProps: props,
              maxLength: typeof e.maxLength === "number" ? e.maxLength : undefined,
            };
          }),
        },
      };
    }),
  };
}
```

Add validation and compilation:

```ts
export function validateEbookDocument(input: unknown): EbookDocumentValidation {
  const document = normalizeEbookDocument(input);
  const errors: string[] = [];
  const seenPageIds = new Set<string>();

  for (const page of document.pages) {
    if (seenPageIds.has(page.id)) errors.push(`Duplicate page id: ${page.id}`);
    seenPageIds.add(page.id);
    if (!page.html.includes(`data-celion-page="${page.id}"`)) errors.push(`Page ${page.id} root must include matching data-celion-page.`);
    if (FORBIDDEN_TAGS.test(page.html)) errors.push(`Page ${page.id} contains a forbidden tag.`);
    if (EVENT_HANDLER_ATTR.test(page.html)) errors.push(`Page ${page.id} contains an event handler attribute.`);

    const selectorBlocks = page.css.split("}").map((block) => block.trim()).filter(Boolean);
    for (const block of selectorBlocks) {
      const selector = block.split("{")[0]?.trim() ?? "";
      if (!selector.startsWith(`[data-celion-page="${page.id}"]`)) {
        errors.push(`Page ${page.id} has unscoped CSS selector: ${selector}`);
      }
      if (GLOBAL_SELECTOR.test(selector) && !selector.startsWith(`[data-celion-page="${page.id}"]`)) {
        errors.push(`Page ${page.id} has global CSS selector: ${selector}`);
      }
    }

    for (const editable of page.manifest.editableElements) {
      if (!page.html.includes(`data-celion-id="${editable.id}"`) && !page.html.includes(`data-celion-id='${editable.id}'`)) {
        errors.push(`Page ${page.id} manifest selector does not resolve: ${editable.selector}`);
      }
    }
  }

  if (document.pages.length === 0) errors.push("Ebook document must contain at least one page.");
  return { ok: errors.length === 0, errors };
}

export function compileEbookDocumentToHtml(input: CelionEbookDocument): string {
  const document = normalizeEbookDocument(input);
  const css = [
    `@page { size: 148mm 210mm; margin: 0; }`,
    `html, body { margin: 0; padding: 0; background: #f4f4f5; }`,
    `.slide { width: ${document.size.width}px; height: ${document.size.height}px; overflow: hidden; page-break-after: always; break-after: page; position: relative; box-sizing: border-box; }`,
    `.slide * { box-sizing: border-box; }`,
    document.themeCss,
    ...document.pages.map((page) => page.css),
  ].join("\n");

  const body = document.pages
    .sort((a, b) => a.index - b.index)
    .map((page, index) => `<div class="slide celion-page-shell" data-slide="${index + 1}" data-page-id="${page.id}">${page.html}</div>`)
    .join("\n");

  return normalizeEbookHtmlSlideContract(sanitizeEbookHtmlForCanvas(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`));
}
```

- [ ] **Step 4: Wire the new test into `test:unit`**

In `package.json`, insert:

```json
"node --import tsx src/lib/ebook-document.test.ts"
```

after `src/lib/ebook-html.test.ts`.

- [ ] **Step 5: Run tests**

Run:

```bash
node --import tsx src/lib/ebook-document.test.ts
npm run typecheck
```

Expected: both pass.

---

### Task 2: Project Storage for `ebook_document`

**Files:**
- Modify: `src/types/project.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/schema.test.ts`
- Modify: `src/lib/projects.ts`
- Modify: `src/lib/projects.test.ts`

- [ ] **Step 1: Add profile type**

In `src/types/project.ts`, import or reference the new document type:

```ts
import type { CelionEbookDocument } from "@/lib/ebook-document";
```

Add to `ProjectProfile`:

```ts
ebookDocument: CelionEbookDocument | null;
```

- [ ] **Step 2: Add schema column**

In `src/lib/db/schema.ts`, after `ebook_html`:

```ts
await sql`
  ALTER TABLE project_profiles
  ADD COLUMN IF NOT EXISTS ebook_document jsonb
`;
```

- [ ] **Step 3: Update schema test**

In `src/lib/db/schema.test.ts`, extend the expected `ALTER TABLE project_profiles` assertions to include:

```ts
assert.ok(statements.some((statement) => statement.includes("ADD COLUMN IF NOT EXISTS ebook_document jsonb")));
```

- [ ] **Step 4: Update project row mapping**

In `src/lib/projects.ts`:

```ts
import { normalizeEbookDocument, type CelionEbookDocument } from "@/lib/ebook-document";
```

Add to `ProfileRow`:

```ts
ebookDocument: unknown;
```

Add to `emptyProfile()`:

```ts
ebookDocument: null,
```

Add to `profileFromRow()`:

```ts
ebookDocument: row.ebookDocument ? normalizeEbookDocument(row.ebookDocument) : null,
```

Add `ebook_document AS "ebookDocument"` to both profile SELECT queries.

Update the insert columns and values:

```sql
ebook_style, ebook_html, ebook_document, ebook_page_count, accent_color
```

```ts
${p.ebookStyle ?? null}, ${p.ebookHtml ?? null}, ${p.ebookDocument ? JSON.stringify(p.ebookDocument) : null}::jsonb,
```

- [ ] **Step 5: Add save helper**

Add this function to `src/lib/projects.ts` near `updateProjectEbookHtml`:

```ts
export async function updateProjectEbookDocument(
  userId: string,
  projectId: string,
  ebookDocument: CelionEbookDocument,
  ebookHtml: string,
) {
  await ensureAppSchema();

  const sql = getSql();
  const updatedAt = new Date();
  const ebookPageCount = getEbookPageCountForHtml(ebookHtml);
  const [profileRows, projectRows] = await sql.transaction([
    sql`
      UPDATE project_profiles
      SET ebook_document = ${JSON.stringify(ebookDocument)}::jsonb,
          ebook_html = ${ebookHtml},
          ebook_page_count = ${ebookPageCount},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = project_profiles.project_id
            AND projects.user_id = ${userId}
        )
      RETURNING project_id
    `,
    sql`
      UPDATE projects
      SET updated_at = ${updatedAt}, status = 'ready'
      WHERE id::text = ${projectId} AND user_id = ${userId}
      RETURNING id
    `,
  ]);

  if ((profileRows as unknown[]).length === 0 || (projectRows as unknown[]).length === 0) {
    return null;
  }

  return getProjectRecordForUser(userId, projectId);
}
```

- [ ] **Step 6: Run storage tests**

Run:

```bash
node --import tsx src/lib/db/schema.test.ts
node --import tsx src/lib/projects.test.ts
npm run typecheck
```

Expected: all pass.

---

### Task 3: Generation Output Becomes Page-Level Document JSON

**Files:**
- Modify: `src/lib/ebook-generation.ts`
- Modify: `src/lib/ebook-generation.test.ts`
- Modify: `src/app/api/ebook/generate/route.ts`

- [ ] **Step 1: Update diagnostics type**

In `src/lib/ebook-generation.ts`, import:

```ts
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  validateEbookDocument,
  type CelionEbookDocument,
} from "@/lib/ebook-document";
```

Add `ebookDocument` to diagnostics:

```ts
type EbookGenerationDiagnostics = {
  blueprintModel: string;
  htmlModel: string;
  blueprint: EbookBlueprint;
  ebookDocument: CelionEbookDocument;
  validation: ReturnType<typeof validateUsableEbookHtml>;
  htmlLength: number;
  slideCount: number;
};
```

- [ ] **Step 2: Change HTML prompt contract**

Replace the HTML system wording from single HTML to document JSON:

```ts
const HTML_SYSTEM = `You are a world-class A5 HTML/CSS slide publication designer.

You receive an approved editorial blueprint.
Do not invent a new structure. Do not rename slide headlines. Do not add generic outline pages.
Your job is to design a complete page-level Celion ebook document.
Return JSON only: { "document": { "version": 1, "size": { "width": 559, "height": 794, "unit": "px" }, "title": "...", "themeCss": "...", "pages": [] } }`;
```

In `buildHtmlPrompt`, replace the technical contract with:

```txt
Technical contract:
- Output only JSON with one "document" field.
- Generate all pages in one response. Do not require page-by-page calls.
- Each page must include id, index, title, role, html, css, manifest, and version.
- Each page html must have one root <section data-celion-page="{pageId}" class="celion-page">.
- Every editable text, shape, image, or container must have data-celion-id, data-role, and data-editable.
- Every page css selector must start with [data-celion-page="{pageId}"].
- Do not use script, iframe, object, embed, form, input, textarea, button, video, audio, canvas, external JS, or external CSS.
- Do not use global selectors like html, body, *, h1, p, div, span, section, or unscoped class selectors.
- The manifest must include every editable element.
```

- [ ] **Step 3: Parse document result**

In `generateEbookHtmlFromBlueprint`, after parsing model JSON:

```ts
const record = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
const ebookDocument = normalizeEbookDocument(record.document);
const documentValidation = validateEbookDocument(ebookDocument);
if (!documentValidation.ok) {
  console.warn("[ebook-generation] document validation failed", {
    stage: "html",
    validationErrors: documentValidation.errors,
  });
  return failGeneration(
    "invalid_html",
    `Gemini returned a page-level document, but it did not pass Celion validation: ${documentValidation.errors[0] ?? "unknown error"}`,
  );
}

const sanitizedHtml = compileEbookDocumentToHtml(ebookDocument);
```

Return:

```ts
return { html: sanitizedHtml, validation, ebookDocument };
```

- [ ] **Step 4: Return document diagnostics**

In `generateEbookHtmlWithDiagnostics`, capture the document:

```ts
const { html, validation, ebookDocument } = await generateEbookHtmlFromBlueprint(args, blueprint);
```

Add it to diagnostics:

```ts
ebookDocument,
```

- [ ] **Step 5: Save generated document in route**

In `src/app/api/ebook/generate/route.ts`, set:

```ts
ebookDocument: diagnostics.ebookDocument,
ebookHtml: html,
```

inside the profile passed to `createProjectForUser`.

- [ ] **Step 6: Update tests**

In `src/lib/ebook-generation.test.ts`, update mocked Gemini HTML response to return:

```json
{
  "document": {
    "version": 1,
    "title": "Generated Guide",
    "size": { "width": 559, "height": 794, "unit": "px" },
    "themeCss": "",
    "pages": [
      {
        "id": "cover",
        "index": 0,
        "title": "Cover",
        "role": "cover",
        "version": 1,
        "html": "<section data-celion-page=\"cover\" class=\"celion-page\"><h1 data-celion-id=\"cover-title\" data-role=\"title\" data-editable=\"text\">Generated Guide</h1><p data-celion-id=\"cover-copy\" data-role=\"body\" data-editable=\"text\">Readable useful content repeated enough for validation.</p></section>",
        "css": "[data-celion-page=\"cover\"] { width: 559px; height: 794px; overflow: hidden; } [data-celion-page=\"cover\"] h1 { font-size: 44px; color: #111111; } [data-celion-page=\"cover\"] p { font-size: 16px; color: #222222; }",
        "manifest": { "editableElements": [{ "id": "cover-title", "role": "title", "type": "text", "selector": "[data-celion-id=\"cover-title\"]", "label": "Title", "editableProps": ["text", "fontSize", "color"] }] }
      }
    ]
  }
}
```

If the existing test needs 8 slides, generate 8 pages in the fixture helper.

- [ ] **Step 7: Run generation tests**

Run:

```bash
node --import tsx src/lib/ebook-document.test.ts
node --import tsx src/lib/ebook-generation.test.ts
npm run typecheck
```

Expected: all pass.

---

### Task 4: Save API Accepts Document Source of Truth

**Files:**
- Modify: `src/app/api/ebook/save/route.ts`
- Modify: `src/lib/ebook-html.test.ts`

- [ ] **Step 1: Extend request schema**

In `src/app/api/ebook/save/route.ts`, import:

```ts
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  validateEbookDocument,
} from "@/lib/ebook-document";
import { updateProjectEbookDocument, updateProjectEbookHtml } from "@/lib/projects";
```

Change schema:

```ts
const schema = z.object({
  projectId: z.string().min(1),
  html: z.string().min(1).optional(),
  document: z.unknown().optional(),
}).refine((value) => value.html || value.document, {
  message: "Either html or document is required",
});
```

- [ ] **Step 2: Add document preparation**

Add:

```ts
type PrepareSaveDocumentResult =
  | { ok: true; document: ReturnType<typeof normalizeEbookDocument>; html: string }
  | { ok: false; message: string };

export function prepareEbookDocumentForSave(document: unknown): PrepareSaveDocumentResult {
  const normalizedDocument = normalizeEbookDocument(document);
  const validation = validateEbookDocument(normalizedDocument);
  if (!validation.ok) {
    return { ok: false, message: validation.errors[0] ?? "Invalid ebook document" };
  }

  const html = compileEbookDocumentToHtml(normalizedDocument);
  const htmlValidation = validateCelionSlideHtml(html, {
    allowGenericOutlineHeadings: true,
  });
  if (!htmlValidation.ok) {
    return { ok: false, message: htmlValidation.errors[0] ?? "Invalid compiled ebook HTML" };
  }

  return { ok: true, document: normalizedDocument, html };
}
```

- [ ] **Step 3: Branch POST save behavior**

In `POST`, before legacy HTML handling:

```ts
if (parsed.data.document) {
  const prepared = prepareEbookDocumentForSave(parsed.data.document);
  if (!prepared.ok) {
    return NextResponse.json({ message: prepared.message }, { status: 400 });
  }

  const result = await updateProjectEbookDocument(
    session.user.id,
    parsed.data.projectId,
    prepared.document,
    prepared.html,
  );

  if (!result) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

Keep the existing `html` path unchanged for legacy saves.

- [ ] **Step 4: Add route tests**

In `src/lib/ebook-html.test.ts`, import:

```ts
import { prepareEbookDocumentForSave } from "../app/api/ebook/save/route";
```

Add tests:

```ts
test("prepareEbookDocumentForSave validates and compiles page-level documents", () => {
  const result = prepareEbookDocumentForSave({
    version: 1,
    title: "Guide",
    size: { width: 559, height: 794, unit: "px" },
    themeCss: "",
    pages: [{
      id: "cover",
      index: 0,
      title: "Cover",
      role: "cover",
      version: 1,
      html: `<section data-celion-page="cover" class="celion-page"><h1 data-celion-id="title" data-role="title" data-editable="text">Guide</h1><p data-celion-id="body" data-role="body" data-editable="text">${"Useful content. ".repeat(20)}</p></section>`,
      css: `[data-celion-page="cover"] { width: 559px; height: 794px; overflow: hidden; } [data-celion-page="cover"] h1 { font-size: 40px; } [data-celion-page="cover"] p { font-size: 16px; }`,
      manifest: { editableElements: [{ id: "title", role: "title", type: "text", selector: `[data-celion-id="title"]`, label: "Title", editableProps: ["text"] }] },
    }],
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.html, /class="slide celion-page-shell"/);
});
```

- [ ] **Step 5: Run save tests**

Run:

```bash
node --import tsx src/lib/ebook-html.test.ts
npm run typecheck
```

Expected: all pass.

---

### Task 5: Editor Loads Document-First and Selects by Manifest

**Files:**
- Modify: `src/app/editor/[projectId]/page.tsx`
- Modify: `src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Pass `initialDocument` from the page**

In `src/app/editor/[projectId]/page.tsx`, update:

```tsx
<EditorShell
  projectId={project.id}
  projectTitle={project.title}
  initialHtml={project.profile.ebookHtml ?? ""}
  initialDocument={project.profile.ebookDocument}
/>
```

- [ ] **Step 2: Add document props and state**

In `EditorShell.tsx`, import:

```ts
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  type CelionEbookDocument,
  type CelionEditableElement,
} from "@/lib/ebook-document";
```

Update props:

```ts
type Props = {
  projectId: string;
  projectTitle: string;
  initialHtml: string;
  initialDocument: CelionEbookDocument | null;
};
```

Initialize:

```ts
const initialEbookDocument = initialDocument ? normalizeEbookDocument(initialDocument) : null;
const [ebookDocument, setEbookDocument] = useState<CelionEbookDocument | null>(initialEbookDocument);
const [html, setHtml] = useState(() => initialEbookDocument ? compileEbookDocumentToHtml(initialEbookDocument) : normalizeEditorHtml(initialHtml));
const [selectedElement, setSelectedElement] = useState<CelionEditableElement | null>(null);
const [selectedPageId, setSelectedPageId] = useState("");
```

- [ ] **Step 3: Select closest manifest element on iframe click**

Replace the old `data-text-editable` click fallback with:

```ts
const celionElement = target.closest("[data-celion-id]") as HTMLElement | null;
if (!celionElement) return;

const pageEl = celionElement.closest("[data-celion-page]") as HTMLElement | null;
const pageId = pageEl?.getAttribute("data-celion-page") ?? "";
const elementId = celionElement.getAttribute("data-celion-id") ?? "";
const manifestElement = ebookDocument?.pages
  .find((page) => page.id === pageId)
  ?.manifest.editableElements
  .find((element) => element.id === elementId);

if (!manifestElement) return;

setSelectedPageId(pageId);
setSelectedElement(manifestElement);
setSelectedText(celionElement.textContent?.trim() ?? "");
setEditValue(celionElement.textContent?.trim() ?? "");
```

Keep the outline behavior.

- [ ] **Step 4: Apply text edits to document HTML**

Replace `applyEdit` document mutation when `ebookDocument` exists:

```ts
function updateSelectedTextInDocument() {
  if (!ebookDocument || !selectedElement || !selectedPageId || !editValue.trim()) return null;

  const nextDocument = structuredClone(ebookDocument);
  const page = nextDocument.pages.find((item) => item.id === selectedPageId);
  if (!page) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(page.html, "text/html");
  const target = doc.querySelector(selectedElement.selector);
  if (!target) return null;

  target.textContent = editValue.trim();
  page.html = doc.body.innerHTML;
  page.version += 1;
  return nextDocument;
}
```

In `applyEdit`:

```ts
const nextDocument = updateSelectedTextInDocument();
if (nextDocument) {
  const newHtml = compileEbookDocumentToHtml(nextDocument);
  setEbookDocument(nextDocument);
  setHtml(newHtml);
  clearSelectionState();
  void saveDocument(nextDocument);
  return;
}
```

Keep legacy HTML mutation as fallback.

- [ ] **Step 5: Save document payload**

Add:

```ts
const saveDocument = async (newDocument: CelionEbookDocument) => {
  setSaving(true);
  setSaveError("");
  try {
    const response = await fetch(`/api/ebook/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, document: newDocument }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Failed to save ebook.");
    }
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : "Failed to save ebook.");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 6: Inspector MVP Controls

**Files:**
- Create: `src/components/editor/inspector-controls.tsx`
- Modify: `src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Create inspector controls**

Create `src/components/editor/inspector-controls.tsx`:

```tsx
"use client";

import type { CelionEditableElement } from "@/lib/ebook-document";

type Props = {
  element: CelionEditableElement | null;
  textValue: string;
  onTextChange: (value: string) => void;
  onApplyText: () => void;
  onStyleChange: (prop: string, value: string) => void;
};

export function InspectorControls({
  element,
  textValue,
  onTextChange,
  onApplyText,
  onStyleChange,
}: Props) {
  if (!element) {
    return (
      <p style={{ fontSize: "12.5px", color: "#a1a1aa", lineHeight: 1.6 }}>
        Click an editable element in the preview.
      </p>
    );
  }

  const canEdit = (prop: string) => element.editableProps.includes(prop as never);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <p style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>{element.label}</p>
        {canEdit("text") ? (
          <textarea
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            rows={6}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e4e4e7", fontSize: "13px", resize: "vertical", boxSizing: "border-box" }}
          />
        ) : null}
      </div>

      {canEdit("text") ? (
        <button onClick={onApplyText} style={{ padding: "8px 14px", borderRadius: "6px", background: "#18181b", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 500 }}>
          Apply text
        </button>
      ) : null}

      <div style={{ display: "grid", gap: "8px" }}>
        {canEdit("fontSize") ? <NumberInput label="Font size" onChange={(value) => onStyleChange("fontSize", `${value}px`)} /> : null}
        {canEdit("fontWeight") ? <NumberInput label="Weight" onChange={(value) => onStyleChange("fontWeight", value)} /> : null}
        {canEdit("color") ? <ColorInput label="Text" onChange={(value) => onStyleChange("color", value)} /> : null}
        {canEdit("backgroundColor") ? <ColorInput label="Background" onChange={(value) => onStyleChange("backgroundColor", value)} /> : null}
        {canEdit("opacity") ? <NumberInput label="Opacity" step="0.1" onChange={(value) => onStyleChange("opacity", value)} /> : null}
      </div>
    </div>
  );
}

function NumberInput({ label, step = "1", onChange }: { label: string; step?: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#71717a" }}>
      {label}
      <input type="number" step={step} onChange={(event) => onChange(event.target.value)} style={{ height: "30px", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "0 8px" }} />
    </label>
  );
}

function ColorInput({ label, onChange }: { label: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: "4px", fontSize: "11px", color: "#71717a" }}>
      {label}
      <input type="color" onChange={(event) => onChange(event.target.value)} style={{ width: "100%", height: "32px", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "2px" }} />
    </label>
  );
}
```

- [ ] **Step 2: Implement page CSS style patching**

In `EditorShell.tsx`, add:

```ts
function applyStyleToSelectedElement(prop: string, value: string) {
  if (!ebookDocument || !selectedElement || !selectedPageId || !value) return;

  const nextDocument = structuredClone(ebookDocument);
  const page = nextDocument.pages.find((item) => item.id === selectedPageId);
  if (!page) return;

  const selector = `[data-celion-page="${page.id}"] ${selectedElement.selector}`;
  const declaration = `${prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}: ${value};`;
  const rule = `${selector} { ${declaration} }`;
  page.css = `${page.css}\n${rule}`;
  page.version += 1;

  const newHtml = compileEbookDocumentToHtml(nextDocument);
  setEbookDocument(nextDocument);
  setHtml(newHtml);
  void saveDocument(nextDocument);
}
```

This intentionally appends a scoped override for MVP. A later cleanup pass can merge declarations into existing rules.

- [ ] **Step 3: Replace right panel body**

Import:

```ts
import { InspectorControls } from "./inspector-controls";
```

Replace the selected text conditional UI with:

```tsx
<InspectorControls
  element={selectedElement}
  textValue={editValue}
  onTextChange={setEditValue}
  onApplyText={applyEdit}
  onStyleChange={applyStyleToSelectedElement}
/>
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

---

### Task 7: Full Verification and Scope Review

**Files:**
- No new files.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
node --import tsx src/lib/ebook-document.test.ts
node --import tsx src/lib/ebook-generation.test.ts
node --import tsx src/lib/ebook-html.test.ts
node --import tsx src/lib/db/schema.test.ts
node --import tsx src/lib/projects.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run full unit tests**

Run:

```bash
npm run test:unit
```

Expected: pass.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff --stat
git diff -- src/lib/ebook-document.ts src/lib/ebook-generation.ts src/components/editor/EditorShell.tsx
```

Expected:

- no unrelated dashboard or wizard styling changes
- default generation still makes two model calls
- `ebook_html` still exists as compiled cache
- editor saves `document` when available and legacy `html` otherwise

- [ ] **Step 5: Manual smoke test**

Start the app if it is not already running:

```bash
npm run dev
```

Then generate one ebook and verify:

- generation creates a project
- editor opens directly
- preview renders pages from compiled HTML
- clicking a manifest element selects it
- right panel text edit saves
- font size or color edit updates the selected element
- export still finds `.slide` pages

---

## Execution Notes

- Do not add page-by-page initial Gemini calls.
- Do not remove `ebook_html` in this implementation.
- Do not build drag/resize/layer panel in this implementation.
- Keep legacy projects working through `initialHtml` fallback.
- Keep edits scoped to ebook document/generation/editor files.
