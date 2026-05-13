-- 024_pii_column_grants.sql
-- Restrict PII (SSN, EIN, tax_id, internal notes) so the `authenticated` role
-- cannot SELECT those columns over PostgREST/Supabase REST. RLS still applies
-- on top — this is column-level defense in depth.
--
-- Reads of PII for legitimate staff workflows go through the service-role
-- admin client (which bypasses these grants) and MUST audit every read via the
-- `record_pii_access(...)` SECURITY DEFINER helper introduced in migration 025.
--
-- Background: columns named `*_encrypted` are currently plaintext `text`.
-- Until pgsodium / vault is wired this REVOKE is the strongest in-DB guarantee
-- we have against PII leaking to a borrower's session via PostgREST.

-- Borrowers: protect SSN, EIN, internal notes, credit_score
revoke select (ssn_encrypted, ein_encrypted, notes, credit_score)
  on borrowers from authenticated;
revoke select (ssn_encrypted, ein_encrypted, notes, credit_score)
  on borrowers from anon;

-- Investors: protect tax_id
revoke select (tax_id_encrypted) on investors from authenticated;
revoke select (tax_id_encrypted) on investors from anon;

-- service_role retains full access (used by audited admin RPCs)
grant select (ssn_encrypted, ein_encrypted, notes, credit_score)
  on borrowers to service_role;
grant select (tax_id_encrypted) on investors to service_role;
