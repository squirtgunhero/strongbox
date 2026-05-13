"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

interface SendResult {
  ok: boolean;
  // We deliberately do NOT reveal whether the email exists. Even when rate-
  // limited we return the same generic "sent" response so an attacker can't
  // enumerate accounts by tripping the limiter.
}

/**
 * Send a password-reset link to the given email. Throttled to 3 attempts per
 * 15 minutes per email, then a longer 10/hour cooldown — values are
 * deliberately tight to deter email-bomb attacks. Supabase's own auth
 * throttle is the second layer.
 */
export async function sendPasswordReset(
  email: string,
  redirectBaseUrl: string
): Promise<SendResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false };
  }

  const short = await rateLimit({
    bucket: "password_reset_short",
    key: normalized,
    max: 3,
    windowSeconds: 15 * 60,
  });
  if (!short.allowed) return { ok: true };

  const long = await rateLimit({
    bucket: "password_reset_long",
    key: normalized,
    max: 10,
    windowSeconds: 60 * 60,
  });
  if (!long.allowed) return { ok: true };

  const admin = createAdminClient();
  if (!admin) {
    // Without service role we can't dispatch through Supabase admin; surface
    // an explicit failure to the form rather than appearing successful.
    return { ok: false };
  }

  const redirectTo = `${redirectBaseUrl.replace(/\/$/, "")}/reset-password`;
  const { error } = await admin.auth.resetPasswordForEmail(normalized, {
    redirectTo,
  });
  if (error) {
    console.error("[forgot-password] resetPasswordForEmail failed", error);
    // Still return ok:true to avoid leaking the existence of the account.
    return { ok: true };
  }
  return { ok: true };
}
