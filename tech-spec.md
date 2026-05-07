# Tech Spec - Celion v1

Updated: 2026-05-07
Version: v1.0

## 1. Scope

This document is the current runtime contract for the Celion app in this repository. It describes the code that is active now, not older editor or billing plans.

Out of scope:

- Self-hosted Better Auth architecture
- Tiptap document editing
- Raw canvas routes
- Payment, team, and analytics systems that are not implemented yet

## 2. Current Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Zod
- Neon Postgres through `@neondatabase/serverless`
- Neon Auth through `@neondatabase/auth`
- Gemini on Vertex AI through `@google/genai`

## 3. Product Flow

Celion is an ebook-generation and editing app.

```text
/new wizard
  -> Basics
  -> Style
  -> Source
  -> Plan
  -> Generate
  -> /editor/[projectId]
```

The wizard requires a signed-in Neon Auth user before it renders the editable flow. Source files are text-normalized in the browser before requests are sent to the server.

## 4. AI Generation

AI generation uses Vertex AI, not AI Studio API keys.

- Plan model: `gemini-2.5-flash-lite`
- Document model: `gemini-3.1-pro-preview`

The server flow is:

1. `POST /api/ebook/plan` creates a source-led ebook plan.
2. The user reviews the plan in the wizard.
3. `POST /api/ebook/generate` renders the approved plan into a page-level ebook document.
4. The generated document and compiled HTML are saved to the project profile.

The plan is a structured JSON contract in `src/lib/ebook-generation.ts`. It is not a database table and is not a separate public document type.

## 5. Authentication

Celion uses Neon Auth.

- Server sessions are resolved through `src/lib/session.ts`.
- Route handlers use `getRouteSession()`.
- Server-rendered pages use `getPageSession()`.
- Client auth calls go through `src/lib/auth-client.ts`.

Neon Auth is backed by Better Auth internally, but this repository does not own a Better Auth adapter or auth schema.

## 6. Database

Celion has one canonical Neon project:

- Neon project ID: `fancy-surf-46017809`
- Primary branch: `production`
- Application database: `celion`

Operational rules:

- `DATABASE_URL` and `NEON_AUTH_BASE_URL` must come from the same Neon branch.
- New environments should usually be Neon branches, not duplicate long-lived projects.
- Schema bootstrap lives in `src/lib/db/schema.ts` and is applied explicitly with `npm run db:init`.
- Runtime request handlers assume the schema is already initialized; they do not run DDL.

Current application tables:

- `projects`
- `project_profiles`
- `source_items`
- `ebook_generation_logs`

Current project data model:

- `projects` owns project identity and user ownership.
- `project_profiles` stores author, target audience, purpose, tone, style, accent color, page count, `ebook_document`, and compiled `ebook_html`.
- `source_items` stores uploaded/pasted source text and excerpts.
- `ebook_generation_logs` stores generation stage, model ids, plan summary, validation, errors, and runtime metrics.

## 7. Editor

The editor route is `/editor/[projectId]`.

Primary editor files:

- `src/components/editor/EditorShell.tsx`
- `src/lib/ebook-document.ts`
- `src/lib/ebook-html.ts`
- `src/app/api/ebook/save/route.ts`

The page-level ebook document is the editable source of truth. Compiled HTML is kept for preview/export compatibility and legacy fallback.

Legacy editor redirect routes are not part of the active route contract.

## 8. API Surface

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[projectId]`
- `DELETE /api/projects/[projectId]`
- `POST /api/ebook/plan`
- `POST /api/ebook/generate`
- `POST /api/ebook/save`

Authorization rule:

- Every project and ebook route requires a valid Neon Auth session.
- Project reads and writes are scoped to `session.user.id`.

## 9. Environment Variables

Required local/runtime env vars:

```env
DATABASE_URL=
DATABASE_OWNER_URL=
APP_DATABASE_ROLE=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
VERTEX_AI_PROJECT_ID=
VERTEX_AI_LOCATION=
VERTEX_AI_SERVICE_ACCOUNT_JSON=
VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64=
GCP_PROJECT_ID=
GCP_PROJECT_NUMBER=
GCP_SERVICE_ACCOUNT_EMAIL=
GCP_WORKLOAD_IDENTITY_POOL_ID=
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=
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

## 10. Current Working Rules

- Keep the wizard simple and source-led.
- Keep "plan" as the active product and code term.
- Keep the page-level ebook document as the editor source of truth.
- Keep generated HTML as a compiled artifact.
- Keep schema changes explicit through `npm run db:init` or a dedicated migration step. Do not run DDL from request paths.
- Avoid reintroducing Tiptap, legacy redirect routes, placeholder footer links, or inactive settings UI without a concrete feature.
