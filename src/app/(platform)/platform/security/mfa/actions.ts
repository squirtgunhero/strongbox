"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdminMembership } from "@/lib/auth/require-platform-admin";

/**
 * Start (or restart) TOTP enrollment for the platform super-admin.
 * Membership-gated only — requiring aal2 here would be the chicken-and-egg
 * (this is the page that grants aal2). Any stale unverified TOTP factor is
 * cleared first so re-entry always works.
 */
export async function enrollPlatformMfa(): Promise<
  | { status: "already_verified" }
  | { status: "enrolled"; factorId: string; qrCode: string; secret: string }
  | { status: "error"; message: string }
> {
  await requirePlatformAdminMembership();
  const supabase = await createClient();

  const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr) return { status: "error", message: listErr.message };

  const totp = list?.totp ?? [];
  if (totp.some((f) => f.status === "verified")) {
    return { status: "already_verified" };
  }
  // Drop any half-finished factor so enroll() doesn't collide.
  for (const f of totp) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Platform console",
  });
  if (error || !data) {
    return { status: "error", message: error?.message || "Enrollment failed" };
  }
  return {
    status: "enrolled",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Verify the 6-digit code. On success Supabase upgrades the session to
 * aal2 (cookies rewritten by the server client), unlocking the rest of the
 * platform console.
 */
export async function verifyPlatformMfa(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requirePlatformAdminMembership();
  const supabase = await createClient();

  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) {
    return { ok: false, message: "Enter the 6-digit code from your app." };
  }

  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (chErr || !ch) {
    return { ok: false, message: chErr?.message || "Challenge failed" };
  }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code: clean,
  });
  if (vErr) {
    return { ok: false, message: vErr.message || "Invalid code" };
  }
  return { ok: true };
}
