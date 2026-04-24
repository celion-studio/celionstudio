# Tech Spec - Celion v1

Created: 2026-04-19
Updated: 2026-04-24
Version: v0.7

## 1. Scope

This document is the current technical source of truth for the Celion app in this repository.

It reflects the code that is actually running today, not an earlier migration plan.

Out of scope for this document:

- Historical Better Auth + Drizzle migration ideas
- Deleted early product-planning drafts from the pre-editor phase
- Future payment, team, and analytics systems that are not implemented yet

## 2. Current Stack

### Frontend

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Zod

### Backend

- Next.js Route Handlers
- TypeScript
- Server-rendered session checks in app routes and API routes

### Database

- Neon Postgres
- `@neondatabase/serverless`
- Direct SQL calls through Neon serverless driver

### Authentication

- Neon Auth
- `@neondatabase/auth`
- Email/password sign-up and sign-in
- Google social sign-in

### AI and document pipeline

- Gemini API key based generation
- The editor stores a paged Tiptap document JSON payload
- Tiptap renders and edits each page in the editor
- The editor supports image nodes with file insertion, selection menus, alignment, crop-frame display, and horizontal resizing
- The editor supports a custom `mediaText` node for stable image-plus-text side-by-side layouts
- Generated HTML is derived at export time from the saved document and is not persisted
- PDF export path remains part of the intended architecture
- Initial ebook generation should use one Gemini Flash call after project creation
- Source files are converted to text before they are sent to the model

Current product direction:

- Celion is now a document-focused editor, closer to Tiptap/Simple Editor document editing than to raw HTML/CSS page composition.
- A paged Tiptap document is the editable source of truth.
- HTML/CSS is only the renderer/export artifact.
- The previous AI layout-token direction is superseded.
- The wizard is an intake flow: setup, source upload, format, generate.

## 3. Canonical Neon Setup

Celion now has one canonical Neon project.

- Neon project ID: `fancy-surf-46017809`
- Primary branch: `production`
- Canonical application database: `celion`

This repository should treat Neon branches as environments. It should not create multiple long-lived Neon projects for the same app unless there is an explicit operational reason.

Operational rule:

- `DATABASE_URL` and `NEON_AUTH_BASE_URL` must always come from the same Neon branch.
- If a new environment is needed, create a new branch inside `fancy-surf-46017809` instead of creating a second Celion project.
- Branch-scoped auth matters because Neon Auth is deployed per branch.

References:

- Neon project model: [Projects](https://neon.com/flow/projects)
- Neon Auth branch behavior: [Meet the New Neon Auth](https://neon.com/blog/neon-auth-branchable-identity-in-your-database)

## 4. Architecture Overview

```text
[Browser / Next.js UI]
        |
        v
[Next.js App Router]
        |
        +--> [Neon Auth client/session]
        +--> [Project API routes]
        +--> [Project generation/revision flow]
        +--> [Tiptap paged document editor / export flow]
        |
        v
[@neondatabase/serverless]
        |
        v
[Neon Postgres project: fancy-surf-46017809]
        |
        v
[Branch: production -> Database: celion]
```

Key principles:

- The app is a single Next.js application.
- Authentication and application data both live on Neon.
- Paged book document JSON is the canonical editable document model.
- HTML is an export-only derived artifact.
- Rich layout affordances should be represented as Tiptap JSON nodes, not as raw HTML stored in the database.
- Project data is persisted in Postgres, not localStorage.

## 5. Authentication Design

Celion currently uses Neon Auth, not self-hosted Better Auth.

### Server side

- `src/lib/auth.ts` builds the server auth instance with `createNeonAuth()`.
- `src/app/api/auth/[...all]/route.ts` delegates auth requests to the Neon Auth handler.
- `src/lib/session.ts` resolves the current session through `auth.getSession()`.

### Client side

- `src/lib/auth-client.ts` creates the browser auth client with `createAuthClient()`.
- UI components call `authClient.signUp.email()`, `authClient.signIn.email()`, and `authClient.signIn.social()`.
- The dashboard and landing page also handle the `neon_auth_session_verifier` callback flow.

### Important implementation note

Neon Auth is built on Better Auth internally, but this repository is not using Better Auth as an app-managed auth server. The app talks to the Neon-managed auth service through Neon SDKs.

That distinction matters because:

- There is no local Better Auth server config in the app.
- There is no Better Auth database adapter owned by this repo.
- OAuth provider setup belongs to Neon Auth configuration for the branch, not to app env vars like `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`.

## 6. Database Design

Celion currently uses one application connection string through `DATABASE_URL`.

The database layer lives in `src/lib/db/index.ts` and:

- Creates a Neon SQL client with `neon(process.env.DATABASE_URL)`
- Throws immediately if `DATABASE_URL` is missing
- Bootstraps required tables at runtime with `ensureAppSchema()`

### Current application tables

- `projects`
- `project_profiles`
- `source_items`
These tables are created lazily by the app on first use. There is no active Drizzle schema or migration workflow in the current implementation.

## 7. Project and API Model

### Current storage model

- A project belongs to a signed-in user via `user_id`
- Profile metadata is stored separately in `project_profiles`
- Uploaded sources are stored in `source_items`
- Editable paged Tiptap document JSON is stored in `project_profiles.document`
- Export HTML is derived on demand from the saved document

Current `project_profiles` metadata is intentionally small: author, target reader, core message, tone, design mode, page format, generation plan, and Tiptap document JSON. `plan` and `document` are stored as JSONB.

### Current editor model

The editor route is `/editor/[projectId]`.

Primary editor files:

- `src/components/editor/EditorShell.tsx`
- `src/components/editor/TiptapBookEditor.tsx`
- `src/components/editor/TiptapPageEditor.tsx`
- `src/lib/tiptap-document.ts`

Current document node policy:

- Standard Tiptap document nodes remain the default for generated copy.
- `image` nodes are supported for user-inserted images.
- Image attrs currently include `src`, `alt`, `title`, `width`, `height`, `fit`, and `align`.
- Image resize UX uses left/right handles and should primarily persist width. Height should only stay fixed when crop-frame behavior needs it.
- `mediaText` is the stable side-by-side image/text layout node. It is preferred over CSS float text wrapping because page overflow currently moves top-level nodes as whole units.
- `mediaText` stores image metadata on the node attrs and stores the adjacent editable text as child block content.
- Export HTML must explicitly render custom nodes. If a new custom Tiptap node is added, `tiptapDocumentToHtml()` and its tests must be updated in the same change.

### Current API surface

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[projectId]`
- `PATCH /api/projects/[projectId]`

Authorization rule:

- Every project route requires a valid Neon Auth session
- Every read/write path is scoped to `session.user.id`

### Wizard and generation flow

The new-project wizard should stay short and document-focused:

```text
Setup -> Source -> Format -> Generate -> Editor
```

The default user-facing flow should not include separate plan, outline, or design-token steps.
Planning can happen internally inside the generation prompt/fallback path.

Initial generation flow:

1. `POST /api/projects` creates the project and stores source text.
2. `PATCH /api/projects/[projectId]` with `action: "generate"` calls Gemini Flash once.
3. The generated document JSON is saved to `project_profiles.document`.
4. The user lands in the editor and edits the document directly.

### Source ingestion

Current safe upload scope:

- Markdown (`.md`)
- Plain text (`.txt`)

Future ingestion scope:

- DOCX text extraction with `mammoth`
- Text PDF extraction with `unpdf` or `pdf-parse`
- Scanned/image PDF OCR as a later advanced path

Important rule:

- Celion does not currently send binary PDF/DOCX files directly to the LLM.
- The app should extract text first, then pass the extracted text to Gemini.
- Until PDF/DOCX extraction exists, the UI should avoid implying full PDF/DOCX support.

## 8. Environment Variables

### Required app env vars

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `GEMINI_API_KEY`

### AI generation contract

- `GEMINI_API_KEY` is the server-side key for live Gemini generation.
- Generation code should not expose this value to the browser.
- Missing or blank `GEMINI_API_KEY` should be handled as a provider-unavailable case and fall back to deterministic local Tiptap document generation rather than making a network call.

### Not part of the current app contract

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Those values may appear in older notes or local scratch files, but they are not part of the current runtime contract for this repository.

### Local development rule

For local Next.js development, prefer `.env.local`.

Next.js resolves env files in precedence order and `.env.local` overrides `.env` in normal development and production modes. Reference: Next.js environment variable load order docs.

### Example

```env
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
GEMINI_API_KEY=
```

## 9. What Was Removed From The Current Plan

The following ideas are no longer treated as active architecture:

- Drizzle as the primary ORM
- Drizzle migrations as the source of truth
- Self-managed Better Auth server configuration
- Better Auth table ownership from within this repo
- Raw HTML/CSS as the editor source of truth
- Iframe preview editing as the main editor model
- Visual page-composition tooling as the current phase
- Custom design-token arrays as the product core
- Direct drag/drop page-composition editing in the editor

If the team wants to reintroduce any of those later, that should be treated as a deliberate redesign, not as finishing the current setup.

## 10. Recommended Working Rules

- Keep one canonical Neon project for Celion: `fancy-surf-46017809`
- Create new environments as branches, not as duplicate projects
- Keep `DATABASE_URL` and `NEON_AUTH_BASE_URL` branch-aligned
- Treat `tech-spec.md` and `.env.example` as the current runtime contract
- Treat deleted early planning docs as obsolete, not as implementation guidance
- Treat Tiptap as the main editor surface
- Keep HTML/CSS controls out of the main editing UI unless they are explicitly scoped to export/debug flows
- Prefer structured Tiptap nodes for editor behavior. Avoid introducing freeform canvas positioning into the document editor.
- Prefer `mediaText` for image-plus-text layouts. Avoid float-based text wrapping until pagination behavior is deliberately redesigned.

## 11. Near-Term Next Steps

- Keep the app on the canonical Neon project and branch model
- Update any remaining stale docs only when they are intended to be active references
- Polish the Tiptap editor surface to match Celion's restrained UI
- Add storage-backed image uploads to replace base64 image persistence in document JSON
- Add more polished media/text controls such as image-side toggle and caption support
- Add DOCX/text-PDF extraction as a dedicated ingestion slice later
- Replace temporary document JSON -> HTML export with a stronger export pipeline
- If schema management becomes painful, evaluate a move to explicit migrations later
- If auth requirements outgrow Neon Auth, decide explicitly whether to stay on Neon Auth or move to a self-hosted Better Auth architecture
