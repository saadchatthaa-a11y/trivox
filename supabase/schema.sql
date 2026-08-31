-- =========================================================
-- Real Estate CRM SaaS — multi-tenant schema
-- Run this in the Supabase SQL editor on a fresh project.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- Organizations (tenants) ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'starter' check (plan in ('starter','pro','agency')),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing','active','past_due','canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now()
);

-- ---------- Org membership (who belongs to which tenant) ----------
create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text,
  role text not null default 'agent' check (role in ('admin','manager','agent')),
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- ---------- Integrations (per-org webhook config) ----------
-- Lets the same WhatsApp/Meta webhook URL route inbound events to the right org.
create table integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  type text not null check (type in ('whatsapp','meta_leads')),
  external_id text not null,   -- WhatsApp phone_number_id, or Facebook page_id
  config jsonb default '{}',   -- access tokens, verify tokens, etc (store securely)
  created_at timestamptz default now(),
  unique(type, external_id)
);

-- ---------- Projects (the properties being marketed) ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  developer_name text,
  location text,
  config text,
  price_range text,
  commission_percent numeric,
  status text default 'active' check (status in ('active','paused','closed')),
  created_at timestamptz default now()
);

-- ---------- Pipeline stages (per-org, so they can be renamed/reordered) ----------
create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  sort_order int not null,
  is_won boolean default false,
  is_lost boolean default false,
  color text default '#5B7189'
);

-- ---------- Campaigns ----------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  description text,
  steps jsonb not null default '[]',  -- [{day, channel, subject, message}]
  created_by uuid references org_members(id),
  created_at timestamptz default now()
);

create table campaign_enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  lead_id uuid,  -- fk added after leads table below
  current_step int default 0,
  status text default 'active' check (status in ('active','completed','exited')),
  enrolled_at timestamptz default now()
);

-- ---------- Leads ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  full_name text,
  phone text not null,
  email text,
  project_id uuid references projects(id),
  source text not null check (source in ('whatsapp','facebook','instagram','referral','manual')),
  stage_id uuid references pipeline_stages(id),
  assigned_to uuid references org_members(id),
  budget text,
  raw_payload jsonb,
  campaign_id uuid references campaigns(id),
  ai_score int,
  ai_tier text check (ai_tier in ('hot','warm','cold')),
  ai_reason text,
  ai_next_action text,
  ai_scored_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table campaign_enrollments
  add constraint campaign_enrollments_lead_fk foreign key (lead_id) references leads(id) on delete cascade;

-- ---------- Activity log ----------
create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  performed_by uuid references org_members(id),
  activity_type text check (activity_type in ('stage_change','call','whatsapp_msg','email','note','site_visit','commission_update','created')),
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id uuid references pipeline_stages(id),
  feedback text,
  created_at timestamptz default now()
);

-- ---------- Commissions ----------
create table commissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  lead_id uuid references leads(id),
  project_id uuid references projects(id),
  booking_value numeric,
  commission_amount numeric,
  commission_status text default 'pending' check (commission_status in ('pending','invoiced','received')),
  created_at timestamptz default now()
);

-- =========================================================
-- Row Level Security — every org only ever sees its own data
-- =========================================================

create or replace function auth_org_ids()
returns setof uuid
language sql stable
as $$
  select org_id from org_members where user_id = auth.uid();
$$;

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table integrations enable row level security;
alter table projects enable row level security;
alter table pipeline_stages enable row level security;
alter table campaigns enable row level security;
alter table campaign_enrollments enable row level security;
alter table leads enable row level security;
alter table lead_activities enable row level security;
alter table commissions enable row level security;

create policy "member can read own org" on organizations
  for select using (id in (select auth_org_ids()));

create policy "member can read org members of own org" on org_members
  for select using (org_id in (select auth_org_ids()));

create policy "org data read" on integrations for select using (org_id in (select auth_org_ids()));
create policy "org data read" on projects for select using (org_id in (select auth_org_ids()));
create policy "org data write" on projects for insert with check (org_id in (select auth_org_ids()));
create policy "org data update" on projects for update using (org_id in (select auth_org_ids()));

create policy "org data read" on pipeline_stages for select using (org_id in (select auth_org_ids()));

create policy "org data read" on campaigns for select using (org_id in (select auth_org_ids()));
create policy "org data write" on campaigns for insert with check (org_id in (select auth_org_ids()));
create policy "org data update" on campaigns for update using (org_id in (select auth_org_ids()));

create policy "org data read" on campaign_enrollments for select using (org_id in (select auth_org_ids()));
create policy "org data write" on campaign_enrollments for insert with check (org_id in (select auth_org_ids()));
create policy "org data update" on campaign_enrollments for update using (org_id in (select auth_org_ids()));

create policy "org data read" on leads for select using (org_id in (select auth_org_ids()));
create policy "org data write" on leads for insert with check (org_id in (select auth_org_ids()));
create policy "org data update" on leads for update using (org_id in (select auth_org_ids()));

create policy "org data read" on lead_activities for select using (org_id in (select auth_org_ids()));
create policy "org data write" on lead_activities for insert with check (org_id in (select auth_org_ids()));

create policy "org data read" on commissions for select using (org_id in (select auth_org_ids()));
create policy "org data write" on commissions for insert with check (org_id in (select auth_org_ids()));
create policy "org data update" on commissions for update using (org_id in (select auth_org_ids()));

-- Note: organizations/org_members INSERT is intentionally NOT open to regular users —
-- new orgs are created server-side (service role) via /api/auth/complete-signup,
-- so a signup can't fabricate membership in someone else's org.
