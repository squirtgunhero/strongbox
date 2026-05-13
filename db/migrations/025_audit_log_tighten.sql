-- 025_audit_log_tighten.sql
-- The original audit_log INSERT policy was `with check (true)`, letting any
-- authenticated user spoof `performed_by` or fabricate `disbursement` /
-- `status_change` entries. Replace it with a policy that pins `performed_by`
-- to the caller's `auth.uid()` so the trail is at least attribution-honest.
--
-- Service-role (cron, admin RPCs) bypasses this and can still write any
-- `performed_by` it wants. Those writes are tracked in code review.
--
-- Also locks search_path on the is_staff / is_admin helpers — without this,
-- a poisoned schema in front of `public` could change which row counts as
-- admin and bypass authorization.

drop policy if exists "Authenticated can insert audit log" on audit_log;

create policy "Authenticated can insert own-attributed audit log"
  on audit_log for insert to authenticated
  with check (performed_by = auth.uid());

-- Harden security definer helpers
alter function is_staff() set search_path = public, pg_temp;
alter function is_admin() set search_path = public, pg_temp;
