"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

export async function reassignLoanOfficer(
  loanId: string,
  newOfficerId: string | null
) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("loans")
    .select("loan_officer_id")
    .eq("id", loanId)
    .single();

  const { error } = await supabase
    .from("loans")
    .update({ loan_officer_id: newOfficerId })
    .eq("id", loanId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loanId,
    action: "update",
    old_values: { loan_officer_id: existing?.loan_officer_id },
    new_values: { loan_officer_id: newOfficerId },
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}
