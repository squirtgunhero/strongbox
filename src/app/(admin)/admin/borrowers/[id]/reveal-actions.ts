"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { decryptFieldSafe } from "@/lib/crypto";

/**
 * Fetch + decrypt a single PII field on a borrower. Audits the access.
 * Only staff (admin / loan_officer with MFA when required) can call this.
 */
async function revealField(
  borrowerId: string,
  column: "ssn_encrypted" | "ein_encrypted",
  fieldLabel: "ssn" | "ein"
): Promise<string | null> {
  const caller = await requireStaff();

  const admin = createAdminClient();
  if (!admin) throw new Error("Service role not configured");

  const { data, error } = await admin
    .from("borrowers")
    .select(column)
    .eq("id", borrowerId)
    .single();
  if (error) throw new Error(error.message);

  const encrypted = (data as Record<string, string | null> | null)?.[column] ?? null;
  // Audit the access regardless of whether a value exists. Never log the value.
  const audit = await createClient();
  await audit.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "access",
    new_values: { field: fieldLabel },
    performed_by: caller.userId,
  });

  return await decryptFieldSafe(encrypted);
}

export async function revealBorrowerSSN(
  borrowerId: string
): Promise<string | null> {
  return revealField(borrowerId, "ssn_encrypted", "ssn");
}

export async function revealBorrowerEIN(
  borrowerId: string
): Promise<string | null> {
  return revealField(borrowerId, "ein_encrypted", "ein");
}
