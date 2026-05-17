"use server";

import { createUnscopedAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { queueNotification } from "@/lib/notifications";
import { passwordResetEmailTemplate } from "@/lib/emails/templates";

interface SendResult {
  ok: boolean;
  // We deliberately do NOT reveal whether the email exists. Even when rate-
  // limited we return the same generic "sent" response so an attacker can't
  // enumerate accounts by tripping the limiter.
}

/**
 * Return the canonical app base URL from env, never from client input.
 */
function getAppBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!configured) {
    throw new Error(
      "Missing app URL configuration. Set NEXT_PUBLIC_APP_URL so password-reset links point to the deployed site."
    );
  }

  const withProtocol = configured.startsWith("http")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}

/**
 * Send a password-reset link to the given email. Throttled to 3 attempts per
 * 15 minutes per email, then a longer 10/hour cooldown — values are
 * deliberately tight to deter email-bomb attacks. Supabase's own auth
 * throttle is the second layer.
 */
export async function sendPasswordReset(
  email: string,
  _redirectBaseUrl: string
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

  const admin = createUnscopedAdminClient();
  if (!admin) {
    // Without service role we can't dispatch through Supabase admin; surface
    // an explicit failure to the form rather than appearing successful.
    return { ok: false };
  }

  // Ignore client-supplied redirectBaseUrl — always use the server-configured
  // app URL. This endpoint is anonymous, so we must NOT trust the request
  // Host header here (it would let an attacker point a victim's reset link
  // at an attacker domain and capture the token).
  const appBase = getAppBaseUrl();
  const redirectTo = `${appBase}/reset-password`;

  // Defensive: generateLink throws if the user doesn't exist. We must NOT
  // surface that distinction to the caller (no account enumeration). Always
  // return ok:true; only attempt delivery if link generation succeeded.
  try {
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: normalized,
        options: { redirectTo },
      });
    if (linkError || !linkData?.properties?.hashed_token) {
      return { ok: true };
    }

    // Link to our own page carrying the single-use token hash; verified
    // there via verifyOtp. Avoids Supabase's hosted verify endpoint, which
    // bounces to the project Site URL (the localhost problem).
    const resetUrl = `${appBase}/reset-password?token_hash=${encodeURIComponent(
      linkData.properties.hashed_token
    )}&type=recovery`;

    // This flow is anonymous: there is no session and therefore no org
    // context (the email could belong to any org, and we deliberately
    // don't enumerate). org_settings is per-org now, so a branded name
    // can't be resolved here — use the product default.
    const orgName = "StrongBox";

    const tpl = passwordResetEmailTemplate({
      resetUrl,
      orgName,
    });

    // notifications is org-scoped. This flow is anonymous, so resolve the
    // owning org from the (now known to exist) user's profile via the
    // unscoped admin client, then queue into that org. If the user has no
    // profile/org we skip delivery rather than leak existence.
    const { data: prof } = await admin
      .from("profiles")
      .select("org_id")
      .eq("email", normalized)
      .maybeSingle();
    if (prof?.org_id) {
      await queueNotification(prof.org_id, {
        recipientEmail: normalized,
        subject: tpl.subject,
        body: tpl.text,
        html: tpl.html,
        eventType: "auth.password_reset_requested",
      });
    }
  } catch (e) {
    console.error("[forgot-password] generateLink/send failed", e);
    // Swallow — never leak whether the account exists.
  }

  return { ok: true };
}
