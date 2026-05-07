# Security Review - 2026-05-05

## Scope

Reviewed the current Next.js app security posture around auth/session handling, ebook generation, project APIs, editor HTML rendering, R2 storage, dependency hygiene, and deployment headers.

## Changes Applied

- Added baseline response headers in `next.config.ts:6-16`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`.
- Added hard request limits before model calls in `src/app/api/ebook/generate/route.ts`: title length, pasted source length, source count, per-source content length, and total source content length.
- Moved the default Vertex AI location to `global` for Gemini 3.1 Pro compatibility in `src/lib/ai/gemini.ts` and `.env.example`.
- Removed implicit database initialization from `npm run build:deploy`; schema initialization now stays explicit through `npm run db:init` or `npm run build:deploy:init-db`.

## Findings

### P3 - CSP is not enforced yet

Evidence:
- `next.config.ts:6-16` now sets baseline hardening headers, but no `Content-Security-Policy` is configured.
- `src/components/editor/editor-shell-panels.tsx:157-161` renders generated ebook HTML with `srcDoc` inside a sandboxed iframe.

Impact:
The editor has meaningful HTML validation and the iframe does not allow scripts, but CSP would still be valuable defense-in-depth for the app shell and third-party asset policy.

Recommended fix:
Start with `Content-Security-Policy-Report-Only` in production, tune around Next.js and the editor preview, then enforce once reports are clean.

## Positive Controls Observed

- Project read/write APIs enforce server-side sessions and user ownership through `getRouteSession()` plus `...ForUser(...)` helpers.
- SQL calls use the Neon tagged-template client rather than string-built SQL.
- Ebook document saves validate and sanitize document/HTML before persistence in `src/app/api/ebook/save/route.ts:46-84`.
- Editable ebook documents reject scripts, iframes, forms, event handlers, inline styles, unscoped CSS, and `url()` tokens in `src/lib/ebook-document.ts:75-77` and `src/lib/ebook-document.ts:450-516`.
- R2 object keys avoid original filename leakage and use generated scoped keys.
- `.env*` files are ignored, and the repo search did not find committed runtime secrets.
- `npm audit --audit-level=moderate` returned 0 vulnerabilities on 2026-05-05.

## Launch Checklist

- Add CSP report-only and review production reports.
- Set production Vertex env to `VERTEX_AI_LOCATION=global` or `GOOGLE_CLOUD_LOCATION=global`.
- Configure production Google auth through Workload Identity Federation or another keyless production credential path.
- Run `npm audit` in CI after dependency changes.
