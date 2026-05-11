"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePositionAgainstLoan } from "@/lib/calculations/distributions";

export async function createInvestor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const investorType = formData.get("investor_type") as string;
  const data: Record<string, unknown> = {
    investor_type: investorType,
    email: formData.get("email"),
    phone: (formData.get("phone") as string) || null,
    committed_capital: parseFloat(formData.get("committed_capital") as string) || 0,
    notes: (formData.get("notes") as string) || null,
  };
  if (investorType === "individual") {
    data.full_name = formData.get("full_name");
  } else {
    data.entity_name = formData.get("entity_name");
  }

  const { data: investor, error } = await supabase
    .from("investors")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "investors",
    record_id: investor.id,
    action: "insert",
    new_values: { investor_type: investorType },
    performed_by: user.id,
  });

  revalidatePath("/admin/investors");
  redirect(`/admin/investors/${investor.id}`);
}

export async function addInvestorPosition(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const investorId = formData.get("investor_id") as string;
  const amount = parseFloat(formData.get("amount") as string);

  const { data: loan } = await supabase
    .from("loans")
    .select("loan_amount")
    .eq("id", loanId)
    .single();
  if (!loan) throw new Error("Loan not found");

  const { data: existing } = await supabase
    .from("investor_positions")
    .select("amount")
    .eq("loan_id", loanId);

  validatePositionAgainstLoan(
    amount,
    existing || [],
    Number(loan.loan_amount)
  );

  const percentage = amount / Number(loan.loan_amount);

  const { error } = await supabase.from("investor_positions").insert({
    investor_id: investorId,
    loan_id: loanId,
    amount,
    percentage,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "investor_positions",
    record_id: loanId,
    action: "insert",
    new_values: { investor_id: investorId, amount, percentage },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath(`/admin/investors/${investorId}`);
}
