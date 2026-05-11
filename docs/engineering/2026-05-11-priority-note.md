# 2026-05-11 Priority Note

This is the current working agenda for the next Celion pass. Treat it as a planning note, not a finished product spec.

## 1. Design Improvement Pass

- Continue improving the landing page and dashboard visual quality.
- Keep the product feeling like a minimal creator studio: neutral, precise, output-led, and commercially sharp.
- Avoid decorative eyebrow labels, section kickers, and overline labels on marketing or landing sections.
- Use Framer Motion for new React UI animation when motion is tied to component state.
- Keep motion short and functional: modal entrances, view transitions, disclosure panels, and subtle list changes.
- Tighten the hero mockup, ebook page previews, dashboard panels, and pricing/billing modal until they look production-ready.

## 2. Polar Billing Integration

- Add Polar subscription payments.
- Design the subscription database model before wiring checkout:
  - subscription record
  - customer mapping
  - plan/product mapping
  - status and renewal fields
  - webhook event persistence or idempotency tracking
- Add checkout, subscription status, and customer portal flows.
- Keep Billing simple in the dashboard: show current plan, subscription state, and upgrade/manage actions.
- Decide entitlement rules before enforcing limits in generation or export.

## 3. Maintenance And Architecture Check

- Review the codebase for maintainability:
  - shared UI components that should be grouped
  - reusable hooks for dashboard/editor flows
  - duplicated CSS patterns after the split
  - DB access helpers and query consistency
  - auth/session boundaries
  - route handler security and ownership checks
  - tests that should be added before larger billing or AI-flow work
- Keep changes small and boring. Avoid broad refactors unless they reduce immediate complexity.
- Preserve the active product flow: `/dashboard` to `/editor/[projectId]`, with the page-level ebook document as source of truth.

## 4. Product Direction Spike: Home And AI Chat

Explore whether Celion should add a separate Home experience:

- Option A: Keep the dashboard as the primary signed-in home and polish it.
- Option B: Add a dedicated Home page with an AI chat-style creation entry point.
- Option C: Turn the current manual wizard into an LLM-guided Q&A flow where users answer conversational questions and the system fills the wizard/plan.
- Option D: Keep the manual wizard as the reliable fallback and layer chat on top as a faster creation mode.

Open questions:

- Does chat replace the wizard or prefill it?
- Should the Home chat create a draft project immediately or wait until enough brief data is collected?
- What minimum answers are required before planning/generation?
- How do we keep the flow simple without adding another stale route like the old `/new`?

## Suggested Order

1. Finish visible design cleanup.
2. Do a short maintenance/security/database audit before adding billing.
3. Design the Polar subscription schema and webhook flow.
4. Implement Polar billing in the smallest usable slice.
5. Run the Home/chat direction spike after the billing foundation is clear.
