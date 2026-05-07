# MVP Hardening - 2026-05-07

## Summary

This note records the CEL-6 hardening pass for the Celion MVP.

The goal was not to complete every enterprise-grade security item. The goal was to make the current MVP safer to test with early users by reducing data mutation risk, AI cost risk, oversized payload risk, and core UX blockers.

## What Changed

### Project Write Safety

- Project ebook save and generation write paths now require a valid `project_profiles` row before mutating project state.
- Save and generated-ebook updates use profile-qualified CTE update paths so project/profile row mismatches do not leave obvious partial state behind.
- Generation updates now check inserted source counts before returning success.

### AI Generation Lifecycle

- Generation requests now claim a project as `generating` before external AI work starts.
- Concurrent generation attempts for the same project are rejected with a retryable response.
- Per-user in-memory throttles reduce repeated plan/generate submissions during MVP testing.
- Failed generation or persistence attempts best-effort restore the previous project status.

This is an MVP guard, not the final job system. A later production version should use persisted generation requests, idempotency keys, a durable queue, and shared rate-limit storage.

### Request And Save Limits

- Project create and generation requests share source count/content limits.
- Ebook save now caps raw HTML size, document JSON size, page count, page HTML size, page CSS size, and theme CSS size.
- The legacy raw HTML save path now rejects active markup such as scripts, event handlers, unsafe links, external CSS, and `url()` tokens.

### Project List Payloads

- The dashboard list API now returns project summaries rather than full source text and ebook blobs.
- Full project detail payloads remain available through the project detail endpoint.

### Route Error Handling

- Project create now handles malformed JSON explicitly.
- Project detail/delete/save routes consistently map transient database unavailable errors to `503`.
- Shared helpers were added for JSON parsing and DB-unavailable responses.

### Security Headers

- Added `Content-Security-Policy-Report-Only` alongside the existing baseline security headers.
- CSP is intentionally report-only for this pass so production reports can be reviewed before enforcement.

### UX And Accessibility

- Dashboard load failures now render an unavailable/retry state instead of looking like an empty workspace.
- Signed-out pricing CTAs preserve signup intent with `/?auth=signup&next=/new`.
- The auth modal now has initial focus, focus trap behavior, focus restore, explicit field labels, and status/alert messaging.
- The wizard purpose control now uses a native select instead of a custom listbox-like details menu.
- Editor preview elements are keyboard-focusable in edit mode and can be selected with Enter or Space.
- Workspace/editor shells now have responsive recovery styles so smaller screens can stack and scroll instead of clipping fixed rails.

## MVP Readiness

This pass makes the current product loop more appropriate for an early MVP:

1. Sign in or sign up.
2. Create a project.
3. Add source material and brief metadata.
4. Generate a plan and ebook.
5. Edit the ebook.
6. Save and export.
7. Reopen projects from the dashboard.

For an invite-only or manually billed MVP, this is an acceptable shape after visual QA and deployment smoke testing.

For a fully self-serve paid launch, the following still need product work:

- Billing and subscription enforcement.
- Usage accounting tied to generation attempts.
- Durable generation jobs and idempotency keys.
- Shared rate limiting rather than process-local throttling.
- Production observability and alerting.

## Verification

Completed during the CEL-6 pass:

- `node .\node_modules\typescript\bin\tsc --noEmit`
- Full direct unit suite with `node --import tsx ...`
- `node .\node_modules\next\dist\bin\next build`
- `git diff --check`

Additional local checks:

- `/`, `/pricing`, `/dashboard`, and `/new` returned `200` on localhost.
- Unauthenticated `/api/projects` returned `401`.
- Pricing CTAs rendered the signup intent URL.
- `Content-Security-Policy-Report-Only` was present in localhost responses.

## Known Follow-Ups

- Add database RLS with trusted per-request DB context once the DB role/session model is ready.
- Replace in-memory throttles with Redis, database-backed counters, or another shared limit store.
- Persist generation request records and idempotency keys.
- Add browser-based QA for editor layout, selection, save, and export.
- Review CSP reports in production and move toward enforcement.
- Keep `next-env.d.ts` out of commits when the dev server only changes generated route-type references or line endings.
