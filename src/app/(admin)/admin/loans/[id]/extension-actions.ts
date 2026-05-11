"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function processExtension(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const newMaturityDate = formData.get("new_maturity_date") as string;
  const extensionMonths = parseInt(formData.get("extension_months") as string);
  const feePoints = parseFloat(formData.get("fee_points") as string) || 0;

  if (!newMaturityDate) throw new Error("New maturity date required");

  // Load current loan
  const { data: loan, error: loadError } = await supabase
    .from("loans")
    .select(
      "loan_amount, maturity_date, extension_count, max_extensions, extension_fee_points"
    )
    .eq("id", loanId)
    .single();
  if (loadError || !loan) throw new Error("Loan not found");

  // Block if at max extensions
  if (
    loan.max_extensions !== null &&
    loan.extension_count >= loan.max_extensions
  ) {
    throw new Error(
      `Loan has reached its maximum of ${loan.max_extensions} extensions`
    );
  }

  // Block if new maturity isn't after current
  if (
    loan.maturity_date &&
    new Date(newMaturityDate) <= new Date(loan.maturity_date)
  ) {
    throw new Error("New maturity date must be after current maturity date");
  }

  const feeAmount = Number(loan.loan_amount) * (feePoints / 100);

  // Update loan
  const { error: updateError } = await supabase
    .from("loans")
    .update({
      maturity_date: newMaturityDate,
      extension_count: loan.extension_count + 1,
    })
    .eq("id", loanId);
  if (updateError) throw new Error(updateError.message);

  // Record the extension fee as a payment row (if any)
  if (feeAmount > 0) {
    await supabase.from("payments").insert({
      loan_id: loanId,
      payment_type: "late_fee", // closest existing type for extension fees
      amount: feeAmount,
      applied_to_late_fees: feeAmount,
      applied_to_default_interest: 0,
      applied_to_interest: 0,
      applied_to_escrow: 0,
      applied_to_principal: 0,
      due_date: new Date().toISOString().split("T")[0],
      received_date: null,
      notes: `Extension fee: ${feePoints}% × ${extensionMonths} month extension to ${newMaturityDate}`,
      recorded_by: user.id,
    });
  }

  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loanId,
    action: "update",
    new_values: {
      extension: {
        new_maturity_date: newMaturityDate,
        extension_count: loan.extension_count + 1,
        fee_amount: feeAmount,
        fee_points: feePoints,
      },
    },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}
