"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

  const admin = createAdminClient();
  if (!admin) {
    // Without service role we can't dispatch through Supabase admin; surface
    // an explicit failure to the form rather than appearing successful.
    return { ok: false };
  }

  // Ignore client-supplied redirectBaseUrl — always use the server-configured
  // app URL to prevent open-redirect attacks.
  const redirectTo = `${getAppBaseUrl()}/reset-password`;

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
    if (linkError || !linkData?.properties?.action_link) {
      return { ok: true };
    }

    // Load org name via the server (anon) client — RLS allows staff reads,
    // but org_name isn't sensitive, so fall back gracefully if unavailable.
    let orgName = "StrongBox";
    try {
      const supabase = await createClient();
      const { data: org } = await supabase
        .from("org_settings")
        .select("org_name")
        .eq("id", 1)
        .single();
      if (org?.org_name) orgName = org.org_name;
    } catch {
      // Non-fatal — keep default org name.
    }

    const tpl = passwordResetEmailTemplate({
      resetUrl: linkData.properties.action_link,
      orgName,
    });

    // Use the admin client so notification insert isn't blocked by RLS
    // (no authenticated user in this anonymous flow).
    await queueNotification(admin, {
      recipientEmail: normalized,
      subject: tpl.subject,
      body: tpl.text,
      html: tpl.html,
      eventType: "auth.password_reset_requested",
    });
  } catch (e) {
    console.error("[forgot-password] generateLink/send failed", e);
    // Swallow — never leak whether the account exists.
  }

  return { ok: true };
}
