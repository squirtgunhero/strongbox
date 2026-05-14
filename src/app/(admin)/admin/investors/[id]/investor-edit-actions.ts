"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { encryptField } from "@/lib/crypto";

export async function updateInvestor(
  investorId: string,
  formData: FormData
) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const investorType = formData.get("investor_type") as string;
  const strOrNull = (key: string): string | null => {
    const v = (formData.get(key) as string)?.trim();
    return v || null;
  };
  const floatOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const update: Record<string, unknown> = {
    investor_type: investorType,
    email: strOrNull("email"),
    phone: strOrNull("phone"),
    committed_capital: floatOrNull("committed_capital") ?? 0,
    notes: strOrNull("notes"),
  };
  if (investorType === "individual") {
    update.full_name = strOrNull("full_name");
    update.entity_name = null;
  } else {
    update.entity_name = strOrNull("entity_name");
    update.full_name = null;
  }

  // tax_id holds SSN (individual) or EIN (entity) — both are 9 digits.
  const taxIdRaw = (formData.get("tax_id") as string | null)?.trim();
  if (taxIdRaw) {
    const digits = taxIdRaw.replace(/\D/g, "");
    if (digits.length !== 9) {
      throw new Error("Tax ID must be 9 digits");
    }
    update.tax_id_encrypted = await encryptField(digits);
  }

  const hasEncryptedWrite = "tax_id_encrypted" in update;
  const writer = hasEncryptedWrite ? createAdminClient() : null;
  if (hasEncryptedWrite && !writer) {
    throw new Error("Service role not configured");
  }
  const client = writer ?? supabase;

  const { error } = await client
    .from("investors")
    .update(update)
    .eq("id", investorId);
  if (error) throw new Error(error.message);

  const auditValues: Record<string, unknown> = { ...update };
  if ("tax_id_encrypted" in auditValues) auditValues.tax_id_encrypted = "[updated]";

  await supabase.from("audit_log").insert({
    table_name: "investors",
    record_id: investorId,
    action: "update",
    new_values: auditValues,
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/investors/${investorId}`);
  revalidatePath("/admin/investors");
}
