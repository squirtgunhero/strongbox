-- Phase 0b: platform control plane — super-admin registry.
-- A platform admin operates ABOVE organizations: no org/profile row, can
-- provision orgs and (only via the audited service-role /platform backend)
-- read/write across orgs. The org_isolation RLS invariant (036) is NOT
-- widened for them — that boundary stays absolute for every authenticated
-- session. This table is intentionally NOT org-scoped.

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

-- Authenticated sessions can at most see their own row. All real
-- provisioning/management goes through the service role, which bypasses
-- RLS; there is deliberately no INSERT/UPDATE/DELETE policy.
create policy "Platform admins can view their own registry row"
  on platform_admins for select
  using (user_id = auth.uid());

-- SECURITY DEFINER so it works regardless of RLS and for users with no
-- org/profile. Mirrors the existing is_staff()/is_admin() pattern.
create or replace function is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Reserved "StrongBox Platform" organization. Owns platform-level audit
-- entries (backup crons, future support-session events) that belong to no
-- customer org. Fixed, well-known id (mirrored by PLATFORM_ORG_ID in
-- src/lib/platform.ts). The restrictive org_isolation policy means no real
-- org can ever see these rows; only the service role / platform console.
-- Not an org_settings tenant (no settings row created for it).
insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-0000000000a1', 'StrongBox Platform', 'platform')
on conflict (id) do nothing;

-- Conditional seed of the platform owner. Links the account iff its
-- auth.users row already exists; otherwise no-ops with a notice so the
-- migration never fails on a fresh database. Re-run this block (or insert
-- manually) once michael@jerseyproper.com has signed up.
do $$
declare
  v_uid uuid;
begin
  select id into v_uid
  from auth.users
  where lower(email) = 'michael@jerseyproper.com';

  if v_uid is null then
    raise notice
      'platform_admins seed skipped: no auth.users row for michael@jerseyproper.com yet. Re-run after the account exists.';
  else
    insert into platform_admins (user_id, email, note)
    values (v_uid, 'michael@jerseyproper.com', 'Platform owner / super-admin')
    on conflict (user_id) do nothing;
  end if;
end $$;
