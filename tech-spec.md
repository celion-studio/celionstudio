# Tech Spec - Celion v1

Updated: 2026-05-09
Version: v1.1

## 1. Scope

This document is the current runtime contract for the Celion app in this repository. It describes the active product and code paths, not older editor, route, billing, or storage plans.

Out of scope:

- Self-hosted Better Auth architecture
- Tiptap document editing
- Raw canvas routes
- The removed `/new` page
- Auth modal flows
- Batch or multi-call ebook generation optimization
- Payment, teams, analytics, durable export hosting, and public creator domains that are not implemented yet

If this document conflicts with the current code, treat the code as the source of truth and update this document.

## 2. Current Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS and CSS custom properties
- Zustand
- Zod
- Neon Postgres through `@neondatabase/serverless`
- Neon Auth through `@neondatabase/auth`
- Gemini on Vertex AI through `@google/genai`
- Client-side export with `html2canvas` and `jspdf`
- Cloudflare R2 utility code exists, but the active product flow still stores source text and generated ebook data in Postgres

## 3. Active Routes

User-facing routes:

- `/` - marketing landing page
- `/auth` - sign-up/sign-in page
- `/dashboard` - account-backed project list and new draft creation
- `/editor/[projectId]` - editor, setup wizard, preview, edit, save, and export
- `/pricing` - pricing page

API routes:

- `/api/auth/[...path]`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[projectId]`
- `DELETE /api/projects/[projectId]` - move a project to trash
- `DELETE /api/projects/[projectId]?permanent=true` - permanently delete a trashed project
- `PATCH /api/projects/[projectId]` - restore a trashed project with `{ "action": "restore" }`
- `GET /api/projects/[projectId]/generation-logs`
- `POST /api/ebook/plan`
- `POST /api/ebook/generate`
- `POST /api/ebook/save`

There is no active `/new` route. New project creation starts from `/dashboard` and opens `/editor/[projectId]`.

## 4. Product Flow

Celion is an ebook-generation and editing app.

```text
/dashboard
  -> POST /api/projects creates an Untitled draft project
  -> /editor/[projectId]
  -> editor opens setup wizard if the project has no ebook content
  -> Basics
  -> Style
  -> Source
  -> Plan
  -> Generate
  -> editable ebook preview in the editor
```

The wizard requires a signed-in Neon Auth user. If an unauthenticated user opens a protected editor project, the app redirects to `/auth?mode=sign-in&next=/editor/[projectId]`.

Source files are normalized in the browser before requests are sent to the server. Project sources are persisted as text in `source_items`; original uploaded files are not currently persisted to R2.

## 5. AI Generation

AI generation uses Vertex AI, not AI Studio API keys.

- Plan model: `gemini-2.5-flash-lite`
- Document model: `gemini-3.1-pro-preview`
- Default generic model constant: `gemini-2.5-flash`

The normal server flow is:

1. `POST /api/ebook/plan` creates a source-led ebook plan.
2. The user reviews and can edit/regenerate the plan in the wizard.
3. `POST /api/ebook/generate` renders the approved plan into a structured page-level ebook document.
4. The compiled HTML and structured document are saved to the project profile.
5. Generation success/failure metadata is written to `ebook_generation_logs`.

Generation currently keeps the MVP plan budget small:

- Minimum plan slides: `8`
- Maximum plan slides: `14`

`/api/ebook/generate` can still generate without a submitted plan by planning first, but the main product flow submits an approved plan from the wizard.

The plan is a structured JSON contract in `src/lib/ebook-generation.ts`. It is not a database table and is not a separate public document type.

## 6. Authentication

Celion uses Neon Auth.

- Server auth is configured in `src/lib/auth.ts`.
- The auth handler lives at `src/app/api/auth/[...path]/route.ts`.
- Server sessions are resolved through `src/lib/session.ts`.
- Route handlers use `getRouteSession()`.
- Server-rendered pages use `getPageSession()`.
- Client auth calls go through `src/lib/auth-client.ts`.
- Auth redirect safety helpers live in `src/lib/auth-redirect.ts`.

The active auth UI is the `/auth` page, not a modal. It accepts:

```text
/auth?mode=sign-up&next=/dashboard
/auth?mode=sign-in&next=/dashboard
```

`next` must be a safe same-origin path. Invalid, external, backslash-containing, or recursive auth paths fall back to `/dashboard`.

Neon Auth is backed by Better Auth internally, but this repository does not own a Better Auth adapter or auth schema.

## 7. Database

Celion has one canonical Neon project:

- Neon project ID: `fancy-surf-46017809`
- Primary branch: `production`
- Application database: `celion`

Operational rules:

- `DATABASE_URL` and `NEON_AUTH_BASE_URL` must come from the same Neon branch.
- New environments should usually be Neon branches, not duplicate long-lived projects.
- Schema bootstrap lives in `src/lib/db/schema.ts`.
- Schema bootstrap is applied explicitly with `npm run db:init` or `npm run build:deploy:init-db`.
- Runtime request handlers assume the schema is already initialized; they do not run DDL from request paths.
- `src/lib/db/index.ts` contains schema initialization helpers and transient Neon error detection used by tests and initialization paths.

Current application tables:

- `projects`
- `project_profiles`
- `source_items`
- `ebook_generation_logs`

Current project data model:

- `projects` owns project identity, user ownership, title, status, timestamps, and `deleted_at` for the dashboard trash flow.
- `project_profiles` stores author, target audience, purpose, tone, design mode, ebook style, accent color, page count, `ebook_document`, and compiled `ebook_html`.
- `source_items` stores uploaded/pasted source text and excerpts.
- `ebook_generation_logs` stores generation stage, model ids, plan summary, validation, generation trace, errors, HTML length, and slide count.

Current project status values:

- `draft`
- `processing_sources`
- `planning`
- `plan_ready`
- `generating`
- `ready`
- `revising`
- `exported`

Trash is not represented as a `ProjectStatus`; trashed projects keep their workflow status and are hidden from active lists with `deleted_at IS NOT NULL`.

## 8. Editor

The editor route is `/editor/[projectId]`.

Primary editor files:

- `src/components/editor/EditorShell.tsx`
- `src/components/editor/editor-shell-panels.tsx`
- `src/components/editor/editor-preview.ts`
- `src/components/editor/editor-preview-frame.ts`
- `src/components/editor/editor-document-edits.ts`
- `src/lib/ebook-document.ts`
- `src/lib/ebook-html.ts`
- `src/app/api/ebook/save/route.ts`

The page-level ebook document is the editable source of truth. Compiled HTML is kept as a preview/export artifact and legacy fallback.

The editor supports:

- View/Edit mode toggle
- Page rail navigation
- iframe-based preview rendering
- Click-to-select editable document elements
- Inspector text and scoped style edits
- Autosave through `POST /api/ebook/save`
- Export as PDF, HTML, PNG, or JPG

Legacy raw HTML save remains as a fallback path, but structured `ebook_document` should be preferred for generated and edited projects.

## 9. Limits and Validation

Request and save limits live in `src/lib/request-limits.ts`.

Current generation input limits:

- Title: `200` characters
- Raw source text: `100,000` characters
- Sources: `8`
- Per-source content: `50,000` characters
- Total source content: `120,000` characters
- Plan slides: `8` to `14`

Current save limits:

- Legacy HTML save: `1,000,000` characters
- Ebook document JSON: `1,250,000` characters
- Ebook document pages: `30`
- Per-page HTML: `90,000` characters
- Per-page CSS: `90,000` characters
- Theme CSS: `30,000` characters

Structured ebook documents reject unsafe tags, inline event handlers, inline styles, unsafe CSS tokens, unscoped selectors, and invalid manifest entries.

## 10. Storage and Export

Active storage:

- Project records, profile metadata, source text, compiled HTML, structured ebook documents, and generation logs are stored in Neon Postgres.

Available but not yet wired into product flow:

- `src/lib/storage/r2.ts` provides Cloudflare R2 config, object-key, public URL, and upload helpers.

Current export behavior:

- PDF/PNG/JPG exports render from the client preview iframe with `html2canvas` and `jspdf`.
- HTML export downloads the compiled ebook HTML directly from the browser.
- Exports are not currently stored server-side or written to R2.

## 11. Environment Variables

Required local/runtime env vars for the active app:

```env
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
```

Database initialization and restricted app roles:

```env
DATABASE_OWNER_URL=
APP_DATABASE_ROLE=
```

Backward-compatible Vertex aliases:

```env
VERTEX_AI_PROJECT_ID=
VERTEX_AI_LOCATION=
```

Optional service-account credentials:

```env
VERTEX_AI_SERVICE_ACCOUNT_JSON=
VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64=
```

Production on Vercel without JSON keys can use OIDC to Google Workload Identity Federation:

```env
GCP_PROJECT_ID=
GCP_PROJECT_NUMBER=
GCP_SERVICE_ACCOUNT_EMAIL=
GCP_WORKLOAD_IDENTITY_POOL_ID=
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=
```

Cloudflare R2 variables are required only when object/file storage is enabled:

```env
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

Local development should normally use Application Default Credentials:

```text
gcloud auth application-default login
```

Production should prefer service-account credentials or Vercel OIDC to Google Workload Identity Federation. The old GenAI Vertex toggle is not part of the current runtime contract.

## 12. Verification

Available scripts:

```text
npm run typecheck
npm run test:unit
npm run build
npm run db:init
npm run build:deploy:init-db
```

When global `npm` is broken in the local Windows environment, the direct equivalents are:

```text
node .\node_modules\typescript\bin\tsc --noEmit
node --import tsx <test-file>
node .\node_modules\next\dist\bin\next build
```

Generation, editor, and persistence changes should run the relevant direct test files from `npm run test:unit` at minimum.

## 13. Current Working Rules

- Keep the wizard simple and source-led.
- Keep "plan" as the active product and code term.
- Keep the page-level ebook document as the editor source of truth.
- Keep generated HTML as a compiled artifact.
- Keep `/dashboard` as the new-project entry point.
- Keep `/auth` as the auth UI entry point.
- Keep schema changes explicit through `npm run db:init` or a dedicated migration step.
- Do not run DDL from request paths.
- Avoid reintroducing `/new`, auth modals, Tiptap, legacy redirect routes, placeholder footer links, inactive settings UI, or batch generation unless there is an explicit product decision.
