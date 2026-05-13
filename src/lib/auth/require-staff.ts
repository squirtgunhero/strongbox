import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "loan_officer";
export type AnyRole = StaffRole | "investor" | "borrower";

export interface AuthenticatedCaller {
  userId: string;
  email: string | null;
  role: AnyRole;
  fullName: string | null;
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
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("Unauthorized: profile not found");

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? null,
    role: profile.role as AnyRole,
    fullName: profile.full_name ?? null,
  };
}

/**
 * Require the caller to be staff (admin or loan_officer).
 * Returns the caller so the handler can audit `performed_by`.
 */
export async function requireStaff(): Promise<AuthenticatedCaller> {
  const caller = await getCaller();
  if (caller.role !== "admin" && caller.role !== "loan_officer") {
    throw new Error("Forbidden: staff role required");
  }
  return caller;
}

/**
 * Require the caller to be a full admin (not just a loan officer).
 */
export async function requireAdmin(): Promise<AuthenticatedCaller> {
  const caller = await getCaller();
  if (caller.role !== "admin") {
    throw new Error("Forbidden: admin role required");
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
