-- 028_pii_column_grants_fix.sql
-- Migration 024 attempted to lock down PII columns with `REVOKE SELECT (col)
-- ON table FROM authenticated`. That's a no-op when a table-level `GRANT
-- SELECT ON table TO authenticated` already exists — column-level REVOKE
-- doesn't subtract from a table-level grant. Supabase ships with the
-- table-level grant on by default, so PII was still readable.
--
-- The correct pattern is REVOKE the table-level SELECT, then GRANT SELECT
-- on an explicit safe-column allowlist. After this migration `authenticated`
-- can no longer read ssn_encrypted, ein_encrypted, notes, credit_score on
-- borrowers or tax_id_encrypted on investors. Same for `anon`. service_role
-- keeps full table access for audited admin RPC reads.
--
-- The RLS regression test in db/tests/rls_regression.sql now passes.

-- ============================================================================
-- BORROWERS
-- ============================================================================
revoke select on borrowers from authenticated, anon;

grant select (
  id, user_id, borrower_type,
  first_name, last_name, email, phone,
  entity_name, formation_state,
  deals_completed,
  created_at, updated_at
) on borrowers to authenticated;

-- anon (signup flow uses anon key) gets nothing — borrowers should never be
-- readable without an authenticated session anyway. RLS would block reads
-- from the anon role even with grants. This is belt+suspenders.

-- ============================================================================
-- INVESTORS
-- ============================================================================
revoke select on investors from authenticated, anon;

-- committed_capital is shown in investor lists/cards; investors.notes is
-- internal-only and stays revoked.
grant select (
  id, user_id, investor_type,
  full_name, entity_name, email, phone,
  committed_capital,
  created_at, updated_at
) on investors to authenticated;
