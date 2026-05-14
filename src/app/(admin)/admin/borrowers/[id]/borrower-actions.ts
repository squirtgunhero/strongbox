"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

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

  const { error } = await supabase
    .from("borrowers")
    .update(update)
    .eq("id", borrowerId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "update",
    new_values: update,
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/borrowers/${borrowerId}`);
  revalidatePath("/admin/borrowers");
}
