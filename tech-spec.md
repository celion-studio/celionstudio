# Tech Spec - Celion v1

Created: 2026-04-19
Updated: 2026-04-20
Version: v0.3

## 1. Scope

This document is the current technical source of truth for the Celion app in this repository.

It reflects the code that is actually running today, not an earlier migration plan.

Out of scope for this document:

- Historical Better Auth + Drizzle migration ideas
- Archived implementation plans under `docs/superpowers/plans`
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
- HTML as the canonical generated artifact
- PDF export path remains part of the intended architecture

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
        +--> [Guide API routes]
        +--> [Guide generation/revision flow]
        +--> [Preview / export flow]
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
- HTML is the canonical content format.
- Guide data is persisted in Postgres, not localStorage.

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

- `guides`
- `guide_profiles`
- `source_items`
- `html_versions`

These tables are created lazily by the app on first use. There is no active Drizzle schema or migration workflow in the current implementation.

## 7. Guide and API Model

### Current storage model

- A guide belongs to a signed-in user via `user_id`
- Profile metadata is stored separately in `guide_profiles`
- Uploaded or pasted sources are stored in `source_items`
- Each generated HTML snapshot is stored in `html_versions`

### Current API surface

- `GET /api/guides`
- `POST /api/guides`
- `GET /api/guides/[guideId]`
- `PATCH /api/guides/[guideId]`

Authorization rule:

- Every guide route requires a valid Neon Auth session
- Every read/write path is scoped to `session.user.id`

## 8. Environment Variables

### Required app env vars

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `GEMINI_API_KEY`

### Not part of the current app contract

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Those values may appear in older notes or local scratch files, but they are not part of the current runtime contract for this repository.

### Local development rule

For local Next.js development, prefer `.env.local`.

Next.js resolves env files in precedence order and `.env.local` overrides `.env` in normal development and production modes. Reference: [Next.js environment variable load order](https://nextjs.org/docs/pages/guides/environment-variables).

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

If the team wants to reintroduce any of those later, that should be treated as a deliberate redesign, not as finishing the current setup.

## 10. Recommended Working Rules

- Keep one canonical Neon project for Celion: `fancy-surf-46017809`
- Create new environments as branches, not as duplicate projects
- Keep `DATABASE_URL` and `NEON_AUTH_BASE_URL` branch-aligned
- Treat `tech-spec.md` and `.env.example` as the current runtime contract
- Treat archived planning docs as historical context only

## 11. Near-Term Next Steps

- Keep the app on the canonical Neon project and branch model
- Update any remaining stale docs only when they are intended to be active references
- If schema management becomes painful, evaluate a move to explicit migrations later
- If auth requirements outgrow Neon Auth, decide explicitly whether to stay on Neon Auth or move to a self-hosted Better Auth architecture
