# Celion BlockNote Document Editor

Created: 2026-04-23
Status: Active implementation spec

## Decision

Celion is moving away from the custom AI design-block editor.

The product is now a document editor first:

```text
BlockNote document JSON
  -> BlockNote editor UI
  -> saved project document
  -> export/PDF artifact
```

This replaces the previous custom design-block direction:

```text
Custom design-block JSON
  -> custom React canvas
  -> custom drag behavior
  -> custom text editing
```

## Why

The user does not want AI design to be the core product mechanic anymore.

That changes the stack decision. If Celion is primarily a Notion-like document editor, the editor model should come from a mature open-source editor instead of a full custom canvas.

BlockNote is the preferred starting point because it already provides:

- block document JSON
- Notion-style editing
- slash menu
- drag/drop block movement
- keyboard behavior
- ProseMirror/Tiptap-based text editing
- React integration

## Current Stack

```text
Editor model: BlockNote document JSON
Editor UI: @blocknote/react + @blocknote/mantine
Storage: project_profiles.blocks jsonb/text JSON payload
Export: internal BlockNote JSON -> HTML renderer for now
Generation: Gemini Flash/fallback should output BlockNote-compatible blocks
```

Installed packages:

- `@blocknote/core`
- `@blocknote/react`
- `@blocknote/mantine`
- `@mantine/core`
- `@mantine/hooks`
- `@mantine/utils`

Avoid for now:

- `@blocknote/xl-*` packages, because their license surface differs
- custom drag-and-drop block editor code
- custom textarea/input editing
- custom design-token inspector

## Runtime Shape

Main builder files:

- `src/components/builder/BuilderShell.tsx`
- `src/components/builder/DocumentEditorPanel.tsx`
- `src/components/builder/DynamicBlockNoteEditor.tsx`
- `src/components/builder/BlockNoteEditor.tsx`
- `src/components/builder/ActionPanel.tsx`

Removed custom editor files:

- `src/components/builder/DocumentEditorCanvas.tsx`
- `src/components/builder/BlockEditorPanel.tsx`
- `src/components/builder/PreviewPanel.tsx`
- `src/components/builder/SourcePanel.tsx`
- `src/components/builder/EmptyBuilderState.tsx`

## Data Model

`project_profiles.blocks` remains the storage column, but its meaning changes:

```text
Before: custom design-block JSON
Now: BlockNote document JSON
```

The TypeScript profile field is no longer a custom design-block array.

```ts
type ProjectProfile = {
  blocks: ProjectDocumentBlock[];
};
```

The helper `src/lib/blocknote-document.ts` owns:

- normalizing BlockNote document JSON
- rendering saved BlockNote JSON into basic export HTML

## Migration Rule

There is no production user data to preserve yet.

The app should not carry a legacy custom-block read bridge. Unknown or old block shapes are dropped by the BlockNote normalizer instead of being imported into the editor model.

## AI Role

AI is no longer responsible for design-token selection.

If AI generation is used, it should output a normal editable document in one initial model call:

- headings
- paragraphs
- bullet list items
- numbered list items
- quotes
- dividers
- tables and images only when the source supports them

AI should not output:

- custom block roles
- visual weights
- layout tokens
- background/spacing tokens
- arbitrary HTML/CSS

The initial wizard should not create a separate user-facing plan/outline step.
Any planning needed for generation can happen inside the prompt or deterministic fallback,
then the result should be saved as editable BlockNote JSON and opened in the builder.

## Wizard Direction

The wizard is now an intake flow, not a planning product surface.

Canonical flow:

```text
Setup -> Source -> Format -> Generate -> Builder
```

Step responsibilities:

- `Setup`: title, author/brand, target reader, core message, tone and manner.
- `Source`: document upload only. No pasted textarea in the current UI.
- `Format`: ebook default, with Kindle/tablet/mobile/print/custom options.
- `Generate`: create the project, run one Gemini Flash document-generation call, then open the builder.

Tone options should include a source-preserving mode for users who want the ebook to stay close to the uploaded document.

The old design/plan/refine wizard steps are intentionally removed. If outline editing returns later, it should live in the builder or as an advanced mode, not as the default path before users see a draft.

## Source Ingestion

Current safe ingestion scope:

- Markdown (`.md`)
- Plain text (`.txt`)

Future ingestion slice:

- DOCX extraction with `mammoth`
- Text PDF extraction with `unpdf` or `pdf-parse`
- Scanned/image PDF OCR only as a later advanced path, likely with `tesseract.js` or a dedicated OCR service

Important rule:

The app does not currently ask Gemini to read uploaded binary files directly.
Files are converted to text first, then the extracted text is sent to the generation prompt.

Until PDF/DOCX extraction is implemented, the UI should not imply that PDF/DOCX content is fully supported.

## Near-Term Cleanup

The old custom block modules and tests have been removed. Any future document behavior should be built on BlockNote JSON directly, not on a parallel custom block model.

## Next Steps

1. Improve BlockNote styling so it matches Celion's restrained editorial UI.
2. Replace the temporary export renderer with BlockNote's own export APIs or a stronger server-safe renderer.
3. Add a real source-ingestion layer for DOCX and text PDFs.
4. Keep AI generation document-writing only.
5. Keep package dependencies aligned with the document-editor stack; do not reintroduce custom drag packages unless a separate non-BlockNote surface needs them.
