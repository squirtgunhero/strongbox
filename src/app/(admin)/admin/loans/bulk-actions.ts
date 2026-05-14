"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateLoanStatus } from "./actions";
import { requireStaff } from "@/lib/auth/require-staff";

export async function bulkAssignOfficer(
  loanIds: string[],
  newOfficerId: string | null
) {
  const caller = await requireStaff();
  const supabase = await createClient();

  if (loanIds.length === 0) throw new Error("No loans selected");

  const { error } = await supabase
    .from("loans")
    .update({ loan_officer_id: newOfficerId })
    .in("id", loanIds);
  if (error) throw new Error(error.message);

  // Audit each loan
  const auditRows = loanIds.map((id) => ({
    table_name: "loans",
    record_id: id,
    action: "update",
    new_values: { loan_officer_id: newOfficerId, bulk: true },
    performed_by: caller.userId,
  }));
  await supabase.from("audit_log").insert(auditRows);

  revalidatePath("/admin/loans");
  return { count: loanIds.length };
}

export async function bulkChangeStatus(loanIds: string[], newStatus: string) {
  await requireStaff();
  if (loanIds.length === 0) throw new Error("No loans selected");

  let succeeded = 0;
  const failures: { loanId: string; error: string }[] = [];

  for (const id of loanIds) {
    try {
      // Reuse the single-loan action so conditions check + audit + notifications
      // all run consistently.
      await updateLoanStatus(id, newStatus);
      succeeded++;
    } catch (e) {
      failures.push({
        loanId: id,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  revalidatePath("/admin/loans");
  return { succeeded, failures };
}
