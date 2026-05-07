# Billing Credits Architecture - 2026-05-05

## Summary

Celion should use a credit-based billing model rather than a simple per-day generation count.

The recommended launch direction is:

- Polar owns checkout, subscriptions, customer state, recurring credit grants, top-ups, and usage meter visibility.
- Celion owns the hot-path enforcement before expensive generation calls.
- A small local credit ledger tracks reservations, debits, releases, and audit history.

## Decision

Use a hybrid model:

```text
Subscription tier -> recurring credits
One-time product -> top-up credits
Generation request -> reserve estimated credits
Successful generation -> commit actual credits
Failed generation -> release reservation
```

Do not model ebook access as a fixed number of generations. A single generation can vary widely in cost depending on source length, requested output depth, model behavior, and future media features.

## Sources

- [Polar Credits](https://polar.sh/features/credits)
- [Polar Usage-Based Billing: Event Ingestion](https://polar.sh/docs/features/usage-based-billing/event-ingestion)
- [Polar Usage-Based Billing: Meters](https://polar.sh/docs/features/usage-based-billing/meters)
- [Polar Customer State](https://polar.sh/docs/integrate/customer-state)
- [Polar Ingest Events API](https://polar.sh/docs/api-reference/events/ingest)
- [Stripe Billing Credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits)
- [Stigg Credits](https://docs.stigg.io/documentation/modeling-your-pricing-in-stigg/credits/overview)
- [OpenMeter Entitlements](https://openmeter.io/docs/billing/entitlements/entitlement)
- [Usage Based Billing Architecture for SaaS Products](https://veldsystems.com/blog/usage-based-billing-architecture)

## Why Credits

Credits are a better fit for Celion because:

- LLM generation cost is variable, while "one generation" sounds fixed.
- Users can understand a monthly allowance without being forced into page-count planning.
- Longer or higher quality generation can cost more without changing plan semantics.
- Top-ups and promotions become straightforward.
- Future image generation, research enrichment, or export features can share the same billing primitive.

## Polar Responsibilities

Polar should be the billing source of truth for:

- Checkout and customer portal.
- Subscription lifecycle.
- Product and price configuration.
- Recurring credit grants attached to subscription products.
- One-time top-up products.
- Usage meters and customer-visible balances.
- Webhook events for customer, subscription, order, benefit, and meter state changes.

Celion should use Polar customer `external_id` as the Celion user id. This avoids depending on Polar ids in application code and keeps reconciliation simple.

## Celion Responsibilities

Celion still needs local enforcement because Polar explicitly leaves balance enforcement to the application.

Celion should own:

- Pre-generation credit checks.
- Credit reservations for long-running AI jobs.
- Idempotency around generation requests.
- Local audit trail for support and debugging.
- Fallback behavior if Polar API calls fail.
- Sending immutable usage events to Polar after committed usage.

## Minimal Data Model

This is a product/engineering design, not a migration spec yet.

```text
billing_customers
- user_id primary key
- polar_customer_id unique null
- polar_external_id unique not null
- created_at
- updated_at

billing_subscriptions
- user_id
- polar_subscription_id unique
- polar_product_id
- status
- current_period_start
- current_period_end
- cancel_at_period_end
- created_at
- updated_at

credit_ledger
- id primary key
- user_id
- type: grant | reserve | debit | release | refund | adjustment | expire
- amount integer
- status: pending | committed | released | failed
- source: polar | generation | admin | system
- idempotency_key unique
- generation_id null
- polar_event_id null
- metadata jsonb
- created_at

webhook_events
- provider
- event_id
- event_type
- processed_at
- payload jsonb
```

Credit amounts should be stored as integers. Avoid floats.

## Balance Semantics

Use a signed ledger:

- Grants and refunds are positive.
- Debits, expirations, and reservations are negative.
- Pending reservations reduce available balance immediately.
- Released reservations no longer reduce available balance.
- Committed debits become the final cost of a successful generation.

Conceptually:

```text
available_balance =
  committed positive/negative ledger entries
  + pending reservations
```

The implementation can cache this value later, but the ledger remains the source of truth.

## Generate Flow

```text
1. Authenticate user.
2. Validate input size limits.
3. Estimate credits for the request.
4. Check available local balance.
5. Create a pending reserve entry with an idempotency key.
6. Call Gemini/Vertex.
7. Calculate actual credits from resulting usage and output size.
8. Convert reserve into committed debit.
9. Release unused reserved credits if estimate exceeded actual cost.
10. Write generation log.
11. Ingest usage event into Polar.
12. Return generated ebook.
```

On failure:

```text
1. Mark generation as failed.
2. Release pending reservation.
3. Do not debit credits.
4. Return a retryable error where appropriate.
```

## Credit Costing V0

Keep the first version simple and conservative.

Example:

```text
base draft generation: 100 credits
large source surcharge: +25 credits per 25k chars above threshold
future image generation: separate meter or higher surcharge
```

Do not expose token math to users in the first launch UI. Show:

```text
Estimated cost: 100 credits
Current balance: 500 credits
Balance after generation: 400 credits
```

Internally, record enough metadata to improve the formula later:

- model id
- estimated input chars
- source count
- generated page count
- generation duration
- reported token usage if available

## Polar Webhooks

Initial webhook events to support:

- `customer.state_changed`
- `subscription.created`
- `subscription.updated`
- `subscription.active`
- `subscription.canceled`
- `subscription.revoked`
- `order.created`
- `order.paid`
- `benefit_grant.created`
- `benefit_grant.updated`
- `benefit_grant.revoked`

Webhook handling must be idempotent:

- Store every provider event id in `webhook_events`.
- Process each event once inside a database transaction.
- Treat duplicate delivery as success.
- Prefer syncing from Polar Customer State when event-specific handling is ambiguous.

## Product Shape

Suggested initial packaging:

```text
Free / Beta
- Small starting credit grant
- No top-up requirement before launch if invite-only
- Strict abuse fuse

Pro
- Monthly recurring credits
- Access to normal ebook generation
- Top-up packs

Team
- Larger recurring credits
- Higher request limits
- Manual onboarding or invoice-first support
```

Use "credits included" in pricing copy, not "generations included".

## Implementation Phases

### Phase 1 - Local Credit Foundation

- Add `credit_ledger`.
- Replace the global daily quota with local balance enforcement.
- Use explicit credit reservations for enforcement; add abuse protection separately only if needed.
- Add reservation and release logic around ebook generation.

### Phase 2 - Polar Sync

- Create Polar products, meter, and credits benefit.
- Add customer mapping with Celion user id as Polar `external_id`.
- Add webhook endpoint with signature verification.
- Sync Customer State into local billing tables.

### Phase 3 - Product UI

- Show credit balance in dashboard/account area.
- Show estimated credit cost before generation.
- Add upgrade/top-up CTA when balance is insufficient.
- Add a simple credit history view if support needs it.

## Open Questions

- Whether unused monthly credits roll over.
- Whether top-up credits expire.
- Whether Team plans get shared organization balance or per-user balance.
- Whether failed generations ever cost a small retry fee.
- Whether page count, source size, or token usage should be the primary V1 pricing driver.
