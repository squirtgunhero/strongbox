-- 031_rate_limit_rls_and_mfa_restrict.sql
-- Two targeted security hardening changes:
--   1. Enable RLS on rate_limit_attempts so anon/authenticated can't read it.
--   2. Restrict user_has_verified_mfa to only allow checking your own status.

-- ============================================================================
-- 1. RLS on rate_limit_attempts
-- ============================================================================
-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated or anon.
-- Only service_role (which bypasses RLS) can access this table,
-- which is correct since only SECURITY DEFINER functions touch it.
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Restrict user_has_verified_mfa to own-user only
-- ============================================================================
-- The original function (029) allowed any authenticated user to check any
-- other user's MFA status, which is an information-disclosure risk.
-- Replace it to enforce auth.uid() == uid.
CREATE OR REPLACE FUNCTION user_has_verified_mfa(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only allow checking own MFA status
  IF uid != auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.mfa_factors
    WHERE user_id = uid AND status = 'verified'
  );
END;
$$;
