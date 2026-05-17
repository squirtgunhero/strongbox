-- Phase 0 (multi-org retrofit): organizations table.
-- Run before 034. This only creates the org registry. The
-- current_org_id() resolver and the organizations RLS policies live at
-- the END of 034, because they depend on profiles.org_id (added in 034) —
-- a function/policy cannot reference a column that does not exist yet.
-- No data is rewritten here; backfill happens in 035.

-- An organization is one hard-money lending shop. A shop has many users
-- (staff, borrowers, investors); each user belongs to exactly one org
-- via profiles.org_id (added in 034).
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on organizations
  for each row execute function update_updated_at();

-- RLS is enabled now; the policies are created in 034 once current_org_id()
-- exists. Until then only the service role / table owner can touch this
-- table, which is correct (org provisioning is a service-role operation).
alter table organizations enable row level security;

-- NOTE: org_settings (008) is still a singleton at this point. It is
-- converted to one row per organization in 035, after org_id is backfilled.
