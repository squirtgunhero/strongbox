import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS. ONLY use server-side and only
 * for operations that genuinely need admin privileges (auth user creation,
 * cron jobs). Returns null if SUPABASE_SERVICE_ROLE_KEY is not configured so
 * callers can show a clean error rather than crash.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
