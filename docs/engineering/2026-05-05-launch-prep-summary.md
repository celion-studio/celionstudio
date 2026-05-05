# Launch Prep Summary - 2026-05-05

## Summary

This note records the launch-prep changes made before the first Celion deployment pass.

The work focused on:

- Making the marketing and pricing surfaces consistent with the current product.
- Hardening auth/session handling before public traffic.
- Adding baseline request and usage protection before expensive model calls.
- Aligning Gemini configuration with the current Gemini Enterprise Agent Platform / Vertex AI path.
- Capturing the next billing direction around Polar credits.

## Product And UI

- Added a pricing page focused on early ebook generation plans.
- Reused the shared marketing header/footer patterns instead of page-specific header markup.
- Simplified the public header CTA so logged-out users see one primary draft-starting action.
- Added a `Book a demo` CTA beside the primary draft CTA on the landing hero.
- Updated landing hero subcopy to focus on turning source material into an editable A5 ebook draft.
- Refined the `/new` wizard and workspace surfaces to better match the current restrained editorial SaaS direction.
- Kept the brief-first product flow: users start with the wizard, then move into the editor after generation.

## Security And Launch Hardening

- Added baseline response headers in `next.config.ts`.
- Replaced host-header based auth self-fetching with the Neon Auth server SDK `auth.getSession()` path.
- Added request limits before Gemini calls:
  - title length
  - pasted source length
  - source count
  - per-source content length
  - total source content length
- Added a DB-backed per-user daily generation limiter using `ebook_generation_logs`.
- Added `CELION_DAILY_GENERATION_LIMIT` to `.env.example`.
- Removed implicit `db:init` from `npm run build:deploy`; schema initialization is now explicit.
- Documented the remaining security posture in `docs/security/security-review-2026-05-05.md`.

## Gemini / Vertex

- Kept the model target on `gemini-3.1-pro-preview`.
- Changed the default Vertex/Gemini location to `global`.
- Updated tests to assert the default `global` location.
- Updated `.env.example` to reflect the production-oriented Gemini Enterprise Agent Platform / Vertex setup.

## Billing Direction

The daily generation limiter is only a temporary launch fuse.

The intended paid model is credit-based:

- Subscription tiers grant recurring credits.
- One-time products can add top-up credits.
- Generation requests reserve estimated credits before model calls.
- Successful generations commit actual debit entries.
- Failed generations release reservations.

The billing architecture is documented in:

- `docs/engineering/2026-05-05-billing-credits.md`

## Verification Completed

The following verification passed during this launch-prep pass:

- `npm.cmd run typecheck`
- `npm.cmd run test:unit`
- `npm.cmd run build`
- `npm.cmd audit --audit-level=moderate`
- `git diff --check`

The local development server was not started for visual verification because the user explicitly requested that Codex not start it.

## Deployment Notes

Before deploying, set production environment variables for:

- `VERTEX_AI_LOCATION=global` or `GOOGLE_CLOUD_LOCATION=global`
- `CELION_DAILY_GENERATION_LIMIT`
- production Google auth credentials or Workload Identity Federation
- Cloudflare R2 credentials and public asset base URL
- Neon database URL and auth configuration

## Follow-Ups

- Implement Polar credits and webhook sync before paid launch.
- Replace the temporary daily generation quota with credit balance enforcement.
- Add generation idempotency keys and reservation semantics.
- Add CSP in report-only mode, review production reports, then enforce.
- Add a small credit balance surface in the dashboard once Polar is connected.
