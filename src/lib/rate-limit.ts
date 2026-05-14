import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check + record a rate-limit attempt. Returns true when the request is
 * within budget, false when it exceeded the threshold and should be denied.
 *
 * Backed by `record_rate_limit_attempt(...)` in migration 027 — a Postgres
 * function that runs as service_role. We deliberately fail OPEN (return
 * `true`) if the admin client isn't configured so a misconfigured local
 * dev env still works; this is acceptable because the limiter is defense-
 * in-depth on top of Supabase's own auth throttles, not the only barrier.
 */
export async function rateLimit(opts: {
  bucket: string;
  key: string;
  max: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean }> {
  const isProd = process.env.NODE_ENV === "production";

  const admin = createAdminClient();
  if (!admin) {
    if (isProd) {
      console.error("[rate-limit] service role not configured — failing closed in production");
      return { allowed: false };
    }
    console.warn("[rate-limit] service role not configured — failing open (dev only)");
    return { allowed: true };
  }
  const { data, error } = await admin.rpc("record_rate_limit_attempt", {
    p_bucket: opts.bucket,
    p_key: opts.key.toLowerCase(),
    p_max_attempts: opts.max,
    p_window_seconds: opts.windowSeconds,
  });
  if (error) {
    if (isProd) {
      console.error("[rate-limit] error checking limit — failing closed in production", error);
      return { allowed: false };
    }
    console.error("[rate-limit] error checking limit — failing open (dev only)", error);
    return { allowed: true };
  }
  return { allowed: data === true };
}
