# Setup Guide

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project. Pick any region
   close to your customers.
2. Wait for provisioning, then open **Project Settings → API**. You'll need:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never
     expose this — it bypasses Row Level Security)

## 2. Run the database migrations

The schema lives in `supabase/migrations/*.sql`, applied in filename order.

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

**Option B — SQL editor:** open each file in `supabase/migrations/` in order
(`0001_...` through `0007_...`) and run it in the Supabase dashboard's SQL
Editor.

This creates every table (owners, settings, products, orders, payments,
customers, etc.), enables Row Level Security with the policies described in
the README, sets up the `public-media` storage bucket for product photos and
logos, and seeds functional defaults (order stages, a starter fulfillment
method, a "Cash at Pickup" payment method, and the default message
templates).

### Demo data (optional)

`supabase/seed.sql` adds four demo toffee products, clearly flagged
`is_demo = true`. Run it the same way (SQL Editor, or
`supabase db push --include-seed` / `psql -f supabase/seed.sql`) if you want
a non-empty storefront to explore before entering your real products. Delete
them anytime from **Admin → Products → Archive**, or with the SQL comment at
the top of `seed.sql`.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three Supabase values from step 1. Everything else is optional
(see steps 5–6).

## 4. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — the storefront. Visit `/login` to create the
**first owner account**: since no owner exists yet, the login page offers
"Create Owner Account" instead of just sign-in. That first account
automatically becomes the store owner (`bootstrap_owner()` in
`0002_functions_triggers.sql` — the first authenticated user ever to sign in
claims ownership; anyone signing up after that does not).

> Supabase Auth requires email confirmation by default. For local
> development, turn it off under **Authentication → Providers → Email →
> Confirm email** so you can sign in immediately after creating the account.
> Turn it back on (or use a custom SMTP provider) before going live.

After signing in you'll land on the **setup wizard** (`/admin/setup`) —
business name, logo, contact info, hours, tax rate, policies, etc. Everything
there is editable later from **Admin → Settings**.

## 5. Email notifications (Resend)

1. Create a free account at [resend.com](https://resend.com).
2. Verify a sending domain (or use their shared testing domain while
   developing).
3. Create an API key.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.

Without these set, the app runs fine — order notifications are simply logged
as "skipped" in the `notification_logs` table instead of sent. Turn email
notifications on/off per-recipient in **Admin → Settings → Business →
Notifications**.

## 6. SMS notifications (Twilio) — optional

1. Create a Twilio account, buy a phone number capable of SMS.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.
3. Turn on "Text me on new orders" in Settings.

This is entirely optional — email works standalone.

## 7. Deploy to Vercel

```bash
npx vercel
```

Or connect the GitHub repo in the Vercel dashboard. Either way:

1. Add the same environment variables from `.env.local` in **Project
   Settings → Environment Variables** (all of them — including the service
   role key, which is safe in Vercel's server-only environment variables).
2. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
3. Deploy. Next.js's `proxy.ts` (the renamed `middleware.ts` in Next 16) runs
   on Vercel's Node.js runtime automatically — no extra config needed.

## Troubleshooting

- **"This store isn't fully configured yet" on checkout** → the service role
  key is missing in your deployment environment.
- **Login page only shows "Sign In", no "Create Owner Account" option, and
  you're locked out** → an owner already exists. Go to Supabase → SQL Editor
  and run `select * from owner_profiles;` to see who; add a new one manually
  with `insert into owner_profiles (id, full_name) values ('<auth-user-uuid>',
  'Name');` once you know the auth user's id from **Authentication → Users**.
- **Product photo/logo upload fails** → confirm migration `0004_storage.sql`
  ran; it creates the `public-media` bucket and its policies.
- **Dashboard doesn't update live** → confirm migration `0007_realtime.sql`
  ran (`alter publication supabase_realtime add table public.orders;`).
