-- ============================================================================
-- MPG OS — Supabase schema + RLS policies
-- Run this in the Supabase SQL editor (SQL > New query > paste > Run).
-- Safe to re-run: uses "if not exists" / "drop policy if exists".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text,
  owner_name text,
  phone text,
  email text,
  address text,
  city text,
  vertical text,                       -- restaurant, retail, healthcare, salon, gym, service
  current_processor text,
  monthly_volume numeric,
  effective_rate numeric,
  estimated_monthly_savings numeric,
  lead_score integer,                  -- 1-10
  status text default 'new',           -- new, contacted, demo_scheduled, proposal_sent, closed_won, closed_lost
  source text,                         -- scraper, referral, statement_audit, manual
  notes text,
  promo_offered boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- call_activity
-- ---------------------------------------------------------------------------
create table if not exists public.call_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  call_date date default current_date,
  outcome text,                        -- no_answer, left_vm, not_interested, callback_scheduled, demo_booked, statement_requested
  notes text,
  talk_track_used text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- statement_audits
-- ---------------------------------------------------------------------------
create table if not exists public.statement_audits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  current_processor text,
  current_effective_rate numeric,
  monthly_volume numeric,
  current_monthly_cost numeric,
  mpg_estimated_cost numeric,
  monthly_savings numeric,
  annual_savings numeric,
  audit_summary text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- referral_partners
-- ---------------------------------------------------------------------------
create table if not exists public.referral_partners (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text,
  partner_type text,                   -- accountant, attorney, realtor, equipment_supplier, insurance
  phone text,
  email text,
  referrals_sent integer default 0,
  deals_closed integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- keep leads.updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- helpful indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_created_at on public.leads(created_at desc);
create index if not exists idx_call_activity_lead on public.call_activity(lead_id);
create index if not exists idx_call_activity_date on public.call_activity(call_date desc);
create index if not exists idx_statement_audits_lead on public.statement_audits(lead_id);

-- ============================================================================
-- Row Level Security
-- This is a single-rep tool. Any authenticated user (the rep) has full access;
-- anonymous visitors get nothing.
-- ============================================================================
alter table public.leads enable row level security;
alter table public.call_activity enable row level security;
alter table public.statement_audits enable row level security;
alter table public.referral_partners enable row level security;

-- leads
drop policy if exists "auth full access leads" on public.leads;
create policy "auth full access leads" on public.leads
  for all to authenticated using (true) with check (true);

-- call_activity
drop policy if exists "auth full access call_activity" on public.call_activity;
create policy "auth full access call_activity" on public.call_activity
  for all to authenticated using (true) with check (true);

-- statement_audits
drop policy if exists "auth full access statement_audits" on public.statement_audits;
create policy "auth full access statement_audits" on public.statement_audits
  for all to authenticated using (true) with check (true);

-- referral_partners
drop policy if exists "auth full access referral_partners" on public.referral_partners;
create policy "auth full access referral_partners" on public.referral_partners
  for all to authenticated using (true) with check (true);
