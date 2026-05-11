-- Phase 8: Reporting & Compliance

-- Single-row org settings table. Single-tenant for now; can become multi-row
-- when multi-tenant lands.
create table org_settings (
  id integer primary key default 1,
  org_name text not null default 'StrongBox Lender',
  licensed_states text[] not null default array[]::text[],
  dual_approval_threshold numeric(14,2) not null default 10000,
  max_ltarv numeric(5,4) not null default 0.75,
  max_ltv numeric(5,4) not null default 0.70,
  max_ltc numeric(5,4) not null default 0.85,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- Seed with empty licensed states (admin must configure)
insert into org_settings (id) values (1) on conflict (id) do nothing;

create trigger set_updated_at before update on org_settings for each row execute function update_updated_at();

alter table org_settings enable row level security;

create policy "Staff can read settings"
  on org_settings for select
  using (is_staff());

create policy "Admin can update settings"
  on org_settings for update
  using (is_admin());

-- Add business-purpose tracking to loans
alter table loans
  add column if not exists is_business_purpose boolean not null default true,
  add column if not exists business_purpose_affidavit_signed_at timestamptz;
