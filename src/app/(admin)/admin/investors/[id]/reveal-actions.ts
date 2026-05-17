"use server";

import { createOrgAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { decryptFieldSafe } from "@/lib/crypto";

/**
 * Fetch + decrypt an investor's tax_id (SSN for individual, EIN for entity).
 * Staff-only; audit-logs every access. Never logs the plaintext value.
 */
export async function revealInvestorTaxId(
  investorId: string
): Promise<string | null> {
  const caller = await requireStaff();

  // Org-scoped: cannot reveal a tax id for an investor in another org.
  const admin = createOrgAdminClient(caller.orgId);
  if (!admin) throw new Error("Service role not configured");

  const { data, error } = await admin
    .from("investors")
    .select("tax_id_encrypted")
    .eq("id", investorId)
    .single();
  if (error) throw new Error(error.message);

  const audit = await createClient();
  await audit.from("audit_log").insert({
    table_name: "investors",
    record_id: investorId,
    action: "access",
    new_values: { field: "tax_id" },
    performed_by: caller.userId,
  });

  return await decryptFieldSafe(data?.tax_id_encrypted ?? null);
}
