-- 029_mfa_settings.sql
-- MFA enforcement controls. The flag lives in org_settings so an admin can
-- toggle it from the settings page once at least one admin has enrolled in
-- a TOTP factor (otherwise we'd lock everyone out).
--
-- The app reads `require_mfa_for_staff` and forces any admin/loan_officer
-- without an AAL2 session to /admin/security/mfa before they can take any
-- privileged action.

alter table org_settings
  add column if not exists require_mfa_for_staff boolean not null default false;

-- Track whether each user has at least one verified MFA factor. Stored
-- separately from auth.mfa_factors so we can query it via PostgREST without
-- exposing the underlying factor table.
create or replace function user_has_verified_mfa(uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp, auth
as $$
  select exists(
    select 1 from auth.mfa_factors
      where user_id = uid and status = 'verified'
  );
$$;

grant execute on function user_has_verified_mfa(uuid) to authenticated, service_role;
