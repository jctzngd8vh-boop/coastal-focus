# Coastal Toffee — Order & Fulfillment App

A complete, mobile-first order-taking and fulfillment app for a small candy
business: a customer storefront, a phone/text/walk-in point-of-sale flow, and
an owner dashboard for products, orders, payments, customers, and reporting —
all in one Next.js app backed by Supabase.

**Nothing about the business is hardcoded.** Name, products, prices, payment
methods, contact info, and policies are all configured by the owner through
an in-app setup wizard and settings screens.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS v4**
- Hand-built shadcn-style UI kit on **Radix UI** primitives
- **Supabase**: Postgres, Auth, Storage, Realtime, Row Level Security
- **Resend** for email notifications, optional **Twilio** for SMS
- **Vitest** for unit/integration tests
- PWA manifest — installable to an iPhone home screen

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project (see docs/SETUP.md)
npm run dev
```

Without Supabase configured, the app still builds and runs — the storefront
and admin show a clear "connect Supabase" message instead of crashing. See
**[docs/SETUP.md](docs/SETUP.md)** for the full Supabase/Resend/Twilio/Vercel
walkthrough, including how to create your first owner account.

For day-to-day use once it's running, see **[docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)**.

## What's here

```
supabase/migrations/   Full Postgres schema, RLS policies, triggers, defaults
supabase/seed.sql       Demo products only — clearly flagged, safe to delete
src/lib/                Business logic: totals, order/payment status machines,
                        order creation, notifications, reporting — the parts
                        with unit tests (src/lib/**/*.test.ts)
src/app/(storefront)/  Public ordering flow: browse → cart → checkout → status
src/app/admin/         Owner dashboard: setup wizard, products, orders,
                        customers, settings, reports (auth-gated)
src/app/pos/           Fast manual order entry for phone/text/walk-in sales
src/app/api/orders/    Public order-creation endpoint (rate-limited,
                        server-computed pricing, idempotent)
src/proxy.ts           Next 16's `middleware` → `proxy`; gates /admin and /pos
```

## Design decisions worth knowing about

- **Money is always integer cents.** Every price, total, and payment is an
  integer column; `src/lib/orders/totals.ts` does all the arithmetic.
- **Public writes never trust the browser for pricing.** The storefront
  checkout API (`src/app/api/orders/route.ts`) re-fetches products and
  recomputes every total server-side using `src/lib/orders/create-order.ts` —
  the same function the POS flow uses, so both channels get identical
  validation and pricing logic.
- **Payment status is never inferred from "a payment link was opened."**
  Every order starts `unpaid`; only an explicit owner action (record a
  payment) moves it forward. This is covered by a dedicated test in
  `src/lib/payments/status.test.ts` and `src/lib/orders/create-order.test.ts`.
- **Customer order-status links use an unguessable token**
  (`src/lib/tokens.ts`, 192-bit random, base64url), never a sequential id.
- **RLS does the real access control**, not just app code: anon/public
  policies only expose active catalog data and business settings; every
  customer/order/payment table has zero anon policies at all. The public
  checkout and status-lookup routes use the Supabase **service role** key
  (server-only) instead of relying on a public RLS insert policy, so pricing
  logic can never be bypassed from the browser. Validated directly against a
  local Postgres 16 instance (see "What was tested" in the PR/handoff notes).
- **Order-creation logic is dependency-injected** (`OrderRepo` interface in
  `create-order.ts`) so the entire checkout workflow — pricing, variant
  validation, inventory, idempotency, customer dedup — is unit-testable
  without a database (`create-order.test.ts` uses an in-memory fake).

## Commands

```bash
npm run dev         # start the dev server (Turbopack)
npm run build        # production build
npm run lint          # ESLint
npm run typecheck    # tsc --noEmit
npm test              # vitest run
```

## Known limitations

- The public order-creation rate limiter is in-memory (per server instance) —
  fine for a single-region deployment; swap for a shared store (e.g. Upstash
  Redis) if you scale to multiple instances/regions.
- Editing an order's line items in the admin doesn't re-open variant-option
  pickers (you can add a product at its base price, adjust quantity, or
  remove a line) — full re-selection of options happens at order creation
  (storefront checkout or POS), not after the fact.
- Revenue is bucketed by order **creation** date, not by when a payment was
  actually recorded, for the Today/Week/Month dashboard cards.
