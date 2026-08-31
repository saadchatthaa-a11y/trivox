# Nestly — Real Estate Lead & Marketing CRM (SaaS starter)

A multi-tenant CRM: each real estate agency signs up as its own organization,
with its own team, leads, and pipeline. Leads come in from WhatsApp and
Facebook/Instagram Lead Ads, get scored and drafted-to by AI, and can be run
through AI-generated drip campaigns. Billing is per-org via Stripe subscriptions.

This is a real, deployable codebase — not a demo. It needs your own Supabase,
Stripe, and Anthropic accounts (all have free tiers to start).

## 1. Create accounts & get keys

- **Supabase** (supabase.com) → New project → Project Settings → API:
  copy `Project URL`, `anon public` key, and `service_role` key.
- **Stripe** (stripe.com) → Developers → API keys: copy your secret key.
  Then Products → create 3 products (Starter/Pro/Agency) with monthly
  recurring prices — copy each Price ID.
- **Anthropic** (console.anthropic.com) → API Keys → create a key.

## 2. Set up the database

In the Supabase SQL editor, run `supabase/schema.sql` in this repo exactly as-is.
It creates every table and the row-level security policies that keep each
agency's data isolated from every other agency's.

## 3. Configure environment variables

```
cp .env.example .env.local
```
Fill in every value from step 1. `NEXT_PUBLIC_APP_URL` should be your deployed
URL (or `http://localhost:3000` while developing).

## 4. Install and run locally

```
npm install
npm run dev
```
Visit `http://localhost:3000`, click "Start free trial", and sign up — this
creates your first organization automatically.

## 5. Wire up Stripe webhooks

Stripe needs to notify your app when someone subscribes, upgrades, or cancels.
- Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  (this prints a webhook signing secret — put it in `STRIPE_WEBHOOK_SECRET`)
- In production: Stripe Dashboard → Developers → Webhooks → Add endpoint →
  `https://yourapp.com/api/webhooks/stripe` → select the events
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.

## 6. Wire up WhatsApp (per agency)

Each agency's WhatsApp Business number needs to be registered in your
`integrations` table so inbound messages route to the right org:

```sql
insert into integrations (org_id, type, external_id, config)
values ('<org uuid>', 'whatsapp', '<phone_number_id from Meta>', '{}');
```

In the Meta App dashboard, set the webhook URL to
`https://yourapp.com/api/webhooks/whatsapp` and the verify token to whatever
you put in `WHATSAPP_VERIFY_TOKEN`.

## 7. Wire up Facebook/Instagram Lead Ads (per agency)

Same idea — register the agency's Page ID:

```sql
insert into integrations (org_id, type, external_id, config)
values ('<org uuid>', 'meta_leads', '<facebook page id>', '{"page_access_token":"..."}');
```

`src/app/api/webhooks/meta-leads/route.ts` has a TODO where you plug in the
real Graph API call to fetch full lead details once your Facebook App is
approved for the `leads_retrieval` permission (this review is required by
Meta and can take a few days — start it early).

## 8. Deploy

Easiest path: push this repo to GitHub, import it in Vercel, paste in the
same environment variables from `.env.local`. Vercel builds and deploys
automatically on every push.

## What's real vs. what's a stub

**Real and working once configured:**
- Multi-tenant auth & signup (creates an org + membership automatically)
- Row-level security — one agency can never see another's leads
- Stripe subscription checkout, billing portal, webhook-driven plan updates
- Kanban lead pipeline reading/writing live Supabase data
- AI lead scoring, AI-drafted follow-ups, AI campaign generation — real
  Claude API calls from the server, gated to Pro/Agency plans
- WhatsApp inbound message → auto-create/update lead

**Stubbed — needs your Meta App review before it's live:**
- Facebook/Instagram Lead Ads: the webhook receives the ping correctly but
  the Graph API call to fetch full lead details is a placeholder (needs a
  Meta App reviewed for `leads_retrieval`)
- Drip campaign *sending*: enrolling a lead is real and logged, but actually
  firing each step on schedule needs a cron job — add a Supabase Edge
  Function (`supabase functions new send-campaign-steps`) scheduled hourly
  that finds due `campaign_enrollments` and sends via WhatsApp Cloud API /
  an email provider like Resend

## Suggested next steps

1. Get it deployed and working end-to-end for your own team first
2. Get your Facebook App reviewed (`leads_retrieval` permission) — start
   this early, it's the slowest step
3. Build the campaign-sending Edge Function
4. Add role-based permission checks (e.g. only admins can see billing)
5. Add a commissions view once you're tracking real bookings
