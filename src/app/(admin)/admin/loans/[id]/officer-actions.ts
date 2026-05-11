"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function reassignLoanOfficer(
  loanId: string,
  newOfficerId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}
