"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

export async function recordLateFee(loanId: string, formData: FormData) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const amount = parseFloat(formData.get("amount") as string);
  const dueDate = formData.get("due_date") as string;
  const notes = (formData.get("notes") as string) || null;

  if (amount <= 0) throw new Error("Amount must be greater than zero");

  const { error } = await supabase.from("payments").insert({
    loan_id: loanId,
    payment_type: "late_fee",
    amount,
    applied_to_late_fees: amount,
    applied_to_default_interest: 0,
    applied_to_interest: 0,
    applied_to_escrow: 0,
    applied_to_principal: 0,
    due_date: dueDate,
    received_date: null, // outstanding until collected
    notes,
    recorded_by: caller.userId,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "payments",
    record_id: loanId,
    action: "insert",
    new_values: { payment_type: "late_fee", amount, due_date: dueDate },
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}
