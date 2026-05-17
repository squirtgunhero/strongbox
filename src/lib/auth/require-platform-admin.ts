import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaRequiredError } from "@/lib/auth/require-staff";

export interface PlatformAdminCaller {
  userId: string;
  email: string | null;
}

/**
 * Membership-only platform guard: caller must be authenticated AND have a
 * platform_admins row. Does NOT require an org profile (the super-admin is
 * above orgs) and does NOT require MFA.
 *
 * This is the floor every /platform surface needs. The MFA *enrollment*
 * page uses exactly this (you can't require aal2 to reach the page that
 * grants aal2 — that's the chicken-and-egg).
 */
export async function requirePlatformAdminMembership(): Promise<PlatformAdminCaller> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: not authenticated");

  // RLS on platform_admins lets a user see only their own row, so a hit
  // here is proof the caller is a platform admin.
  const { data: row, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unauthorized: platform admin check failed");
  if (!row) throw new Error("Forbidden: platform admin required");

  return { userId: user.id, email: user.email ?? null };
}

/**
 * Full platform guard: membership + MFA. The platform console has cross-org
 * reach via the service role, so MFA is mandatory — an aal1 session is
 * rejected with MfaRequiredError. Every sensitive /platform page and every
 * platform server action MUST call this (or the redirect variant) before
 * touching the service-role client.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminCaller> {
  const caller = await requirePlatformAdminMembership();

  const supabase = await createClient();
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    throw new MfaRequiredError(
      "Multi-factor authentication is required for the platform console"
    );
  }

  return caller;
}

/**
 * Page-friendly variant: same as requirePlatformAdmin but on a missing-MFA
 * session it redirects to the platform MFA enrollment page instead of
 * throwing, so a fresh super-admin has a path to enroll. Non-members still
 * hard-fail (the membership check throws before the MFA check).
 */
export async function requirePlatformAdminOrEnrollMfa(): Promise<PlatformAdminCaller> {
  try {
    return await requirePlatformAdmin();
  } catch (e) {
    if (e instanceof MfaRequiredError) {
      redirect("/platform/security/mfa");
    }
    throw e;
  }
}
