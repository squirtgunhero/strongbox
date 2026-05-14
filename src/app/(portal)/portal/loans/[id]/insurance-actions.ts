"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCaller } from "@/lib/auth/require-staff";

export async function updateInsurance(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const caller = await getCaller();
  const user = { id: caller.userId };

  // Staff can update any loan's insurance; borrowers can only update their own
  if (caller.role !== "admin" && caller.role !== "loan_officer") {
    const { data: link } = await supabase
      .from("loan_borrowers")
      .select("id, borrowers!inner(user_id)")
      .eq("loan_id", loanId)
      .eq("borrowers.user_id", caller.userId)
      .maybeSingle();
    if (!link) throw new Error("Forbidden: not authorized for this loan");
  }

  const numOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };
  const strOrNull = (key: string): string | null => {
    const v = (formData.get(key) as string)?.trim();
    return v || null;
  };

  const { error } = await supabase.rpc("update_loan_insurance", {
    loan_id_arg: loanId,
    carrier_arg: strOrNull("carrier"),
    policy_number_arg: strOrNull("policy_number"),
    coverage_amount_arg: numOrNull("coverage_amount"),
    expiration_date_arg: strOrNull("expiration_date"),
    agent_name_arg: strOrNull("agent_name"),
    agent_email_arg: strOrNull("agent_email"),
    agent_phone_arg: strOrNull("agent_phone"),
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loanId,
    action: "update",
    new_values: { insurance: true },
    performed_by: user.id,
  });

  revalidatePath(`/portal/loans/${loanId}`);
  revalidatePath(`/admin/loans/${loanId}`);
}
