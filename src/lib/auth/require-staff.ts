import { createClient } from "@/lib/supabase/server";
import { getOrgSettings } from "@/lib/org-settings";

export type StaffRole = "admin" | "loan_officer";
export type AnyRole = StaffRole | "investor" | "borrower";

export interface AuthenticatedCaller {
  userId: string;
  /** The lending-shop organization this user belongs to. */
  orgId: string;
  email: string | null;
  role: AnyRole;
  fullName: string | null;
  /** AAL2 = user has a verified MFA factor and used it for this session. */
  aal: "aal1" | "aal2";
  /** True iff the caller has at least one verified MFA factor enrolled. */
  hasMfaEnrolled: boolean;
}

export class MfaRequiredError extends Error {
  constructor(message = "Multi-factor authentication required") {
    super(message);
    this.name = "MfaRequiredError";
  }
}

/**
 * Loads the authenticated caller and their profile role.
 * Throws if the request has no session or no profile row.
 *
 * Every Server Action and route handler that mutates data on behalf of someone
 * other than the caller (or that uses the service-role client) MUST go through
 * one of these guards. Do not rely on RLS alone — the service-role client
 * bypasses it, and Server Action IDs are addressable from any session.
 */
export async function getCaller(): Promise<AuthenticatedCaller> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: not authenticated");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, email, org_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("Unauthorized: profile not found");
  if (!profile.org_id) {
    throw new Error("Unauthorized: profile has no organization");
  }

  // Authenticator assurance level: aal2 means MFA-verified for this session.
  // We don't fail open on errors — better to treat unknown as aal1 (no MFA).
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const aal: "aal1" | "aal2" =
    aalData?.currentLevel === "aal2" ? "aal2" : "aal1";

  // Whether they've enrolled at least one factor (separate from whether
  // they've used it on this session). Used to render the "enroll now" CTA
  // on the security page.
  const { data: mfaCheck } = await supabase.rpc("user_has_verified_mfa", {
    uid: user.id,
  });

  return {
    userId: user.id,
    orgId: profile.org_id as string,
    email: profile.email ?? user.email ?? null,
    role: profile.role as AnyRole,
    fullName: profile.full_name ?? null,
    aal,
    hasMfaEnrolled: Boolean(mfaCheck),
  };
}

/**
 * Require the caller to be staff (admin or loan_officer).
 * Returns the caller so the handler can audit `performed_by`.
 *
 * Also enforces MFA if `org_settings.require_mfa_for_staff` is on: callers
 * with no aal2 session throw MfaRequiredError. UI catches this and redirects
 * to /admin/security/mfa for enrollment / challenge.
 */
export async function requireStaff(): Promise<AuthenticatedCaller> {
  const caller = await getCaller();
  if (caller.role !== "admin" && caller.role !== "loan_officer") {
    throw new Error("Forbidden: staff role required");
  }

  const supabase = await createClient();
  const settings = await getOrgSettings(supabase);
  if (settings?.require_mfa_for_staff && caller.aal !== "aal2") {
    throw new MfaRequiredError(
      caller.hasMfaEnrolled
        ? "Complete MFA challenge to continue"
        : "Enroll MFA before continuing"
    );
  }

  return caller;
}

/**
 * Require the caller to be a full admin (not just a loan officer).
 * Same MFA enforcement as requireStaff.
 */
export async function requireAdmin(): Promise<AuthenticatedCaller> {
  const caller = await getCaller();
  if (caller.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  const supabase = await createClient();
  const settings = await getOrgSettings(supabase);
  if (settings?.require_mfa_for_staff && caller.aal !== "aal2") {
    throw new MfaRequiredError();
  }
  return caller;
}

/**
 * Require any one of a set of roles.
 */
export async function requireRole(
  ...allowed: AnyRole[]
): Promise<AuthenticatedCaller> {
  const caller = await getCaller();
  if (!allowed.includes(caller.role)) {
    throw new Error(`Forbidden: requires one of ${allowed.join(", ")}`);
  }
  return caller;
}
