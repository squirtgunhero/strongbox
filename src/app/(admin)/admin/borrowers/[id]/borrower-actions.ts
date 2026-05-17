"use server";

import { createClient } from "@/lib/supabase/server";
import { createOrgAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { encryptField } from "@/lib/crypto";

export async function updateBorrower(
  borrowerId: string,
  formData: FormData
) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const borrowerType = formData.get("borrower_type") as string;
  const intOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseInt(v);
    return isNaN(n) ? null : n;
  };
  const strOrNull = (key: string): string | null => {
    const v = (formData.get(key) as string)?.trim();
    return v || null;
  };

  const update: Record<string, unknown> = {
    borrower_type: borrowerType,
    email: strOrNull("email"),
    phone: strOrNull("phone"),
    deals_completed: intOrNull("deals_completed") ?? 0,
    credit_score: intOrNull("credit_score"),
    notes: strOrNull("notes"),
  };

  if (borrowerType === "individual") {
    update.first_name = strOrNull("first_name");
    update.last_name = strOrNull("last_name");
    update.entity_name = null;
    update.formation_state = null;
  } else {
    update.entity_name = strOrNull("entity_name");
    update.formation_state = strOrNull("formation_state");
    update.first_name = null;
    update.last_name = null;
  }

  // SSN / EIN: only updated when a non-empty value is submitted. Strip
  // non-digits and validate length before encrypting. Empty submission keeps
  // the existing encrypted value.
  const ssnRaw = (formData.get("ssn") as string | null)?.trim();
  if (ssnRaw && borrowerType === "individual") {
    const digits = ssnRaw.replace(/\D/g, "");
    if (digits.length !== 9) {
      throw new Error("SSN must be 9 digits");
    }
    update.ssn_encrypted = await encryptField(digits);
  }
  const einRaw = (formData.get("ein") as string | null)?.trim();
  if (einRaw && borrowerType === "entity") {
    const digits = einRaw.replace(/\D/g, "");
    if (digits.length !== 9) {
      throw new Error("EIN must be 9 digits");
    }
    update.ein_encrypted = await encryptField(digits);
  }

  // Column-level grants block writes to the encrypted columns from the
  // authenticated role, so the write goes through the service-role client.
  // requireStaff above gates who can reach this code path.
  const hasEncryptedWrite =
    "ssn_encrypted" in update || "ein_encrypted" in update;
  // Org-scoped service client: bypasses the column-level grant on the
  // encrypted columns but the wrapper still constrains the UPDATE to
  // caller.orgId, so staff can't write PII onto another org's borrower.
  const writer = hasEncryptedWrite
    ? createOrgAdminClient(caller.orgId)
    : null;
  if (hasEncryptedWrite && !writer) {
    throw new Error("Service role not configured");
  }

  const client = writer ?? supabase;
  const { error } = await client
    .from("borrowers")
    .update(update)
    .eq("id", borrowerId);
  if (error) throw new Error(error.message);

  // Don't log encrypted blobs into the audit_log — flag the fields touched.
  const auditValues: Record<string, unknown> = { ...update };
  if ("ssn_encrypted" in auditValues) auditValues.ssn_encrypted = "[updated]";
  if ("ein_encrypted" in auditValues) auditValues.ein_encrypted = "[updated]";

  await supabase.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "update",
    new_values: auditValues,
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/borrowers/${borrowerId}`);
  revalidatePath("/admin/borrowers");
}
