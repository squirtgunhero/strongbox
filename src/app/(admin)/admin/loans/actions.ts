"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { queueNotification } from "@/lib/notifications";
import { requireStaff } from "@/lib/auth/require-staff";

export async function createLoan(formData: FormData) {
  const caller = await requireStaff();
  const supabase = await createClient();

  // State licensure guardrail
  const state = (formData.get("address_state") as string)?.toUpperCase();
  const { data: settings } = await supabase
    .from("org_settings")
    .select("licensed_states")
    .eq("id", 1)
    .single();
  const licensedStates: string[] = settings?.licensed_states || [];
  if (licensedStates.length > 0 && !licensedStates.includes(state)) {
    throw new Error(
      `Cannot originate loans in ${state}. Licensed states: ${licensedStates.join(", ")}. Update in Settings.`
    );
  }

  // Create property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert({
      address_street: formData.get("address_street") as string,
      address_city: formData.get("address_city") as string,
      address_state: formData.get("address_state") as string,
      address_zip: formData.get("address_zip") as string,
      property_type: formData.get("property_type") as string,
      purchase_price: parseFloat(formData.get("purchase_price") as string) || null,
      as_is_value: parseFloat(formData.get("as_is_value") as string) || null,
      after_repair_value: parseFloat(formData.get("after_repair_value") as string) || null,
      rehab_budget: parseFloat(formData.get("rehab_budget") as string) || null,
    })
    .select()
    .single();

  if (propError) throw new Error(propError.message);

  // Create borrower
  const borrowerType = formData.get("borrower_type") as string;
  const borrowerData: Record<string, unknown> = {
    borrower_type: borrowerType,
    email: formData.get("borrower_email") as string,
    phone: formData.get("borrower_phone") as string,
    deals_completed: parseInt(formData.get("deals_completed") as string) || 0,
  };

  if (borrowerType === "individual") {
    borrowerData.first_name = formData.get("first_name") as string;
    borrowerData.last_name = formData.get("last_name") as string;
  } else {
    borrowerData.entity_name = formData.get("entity_name") as string;
    borrowerData.formation_state = formData.get("formation_state") as string;
  }

  const { data: borrower, error: borError } = await supabase
    .from("borrowers")
    .insert(borrowerData)
    .select()
    .single();

  if (borError) throw new Error(borError.message);

  // Create loan
  const loanAmount = parseFloat(formData.get("loan_amount") as string);
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      property_id: property.id,
      status: (formData.get("status") as string) || "lead",
      loan_purpose: formData.get("loan_purpose") as string,
      exit_strategy: formData.get("exit_strategy") as string,
      loan_amount: loanAmount,
      current_principal: loanAmount,
      interest_rate: parseFloat(formData.get("interest_rate") as string) / 100,
      points: parseFloat(formData.get("points") as string) / 100 || null,
      day_count: (formData.get("day_count") as string) || "actual_360",
      term_months: parseInt(formData.get("term_months") as string),
      loan_officer_id: caller.userId,
    })
    .select()
    .single();

  if (loanError) throw new Error(loanError.message);

  // Link borrower to loan
  const { error: linkError } = await supabase.from("loan_borrowers").insert({
    loan_id: loan.id,
    borrower_id: borrower.id,
    is_primary: true,
  });

  if (linkError) throw new Error(linkError.message);

  // Audit log
  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loan.id,
    action: "insert",
    new_values: { status: loan.status, loan_amount: loanAmount },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/loans");
  redirect(`/admin/loans/${loan.id}`);
}

export async function updateLoanStatus(loanId: string, newStatus: string) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("loans")
    .select("status")
    .eq("id", loanId)
    .single();

  // Per spec: never allow funding without all conditions cleared
  if (newStatus === "funded") {
    const { data: openConditions } = await supabase
      .from("loan_conditions")
      .select("description")
      .eq("loan_id", loanId)
      .eq("is_satisfied", false);

    if (openConditions && openConditions.length > 0) {
      throw new Error(
        `Cannot fund: ${openConditions.length} condition${openConditions.length === 1 ? "" : "s"} still open. Clear all conditions before funding.`
      );
    }
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "defaulted") {
    updateData.is_defaulted = true;
    updateData.default_date = new Date().toISOString().split("T")[0];
  }
  if (newStatus === "funded") {
    updateData.funded_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("loans")
    .update(updateData)
    .eq("id", loanId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loanId,
    action: "status_change",
    old_values: { status: existing?.status },
    new_values: { status: newStatus },
    performed_by: caller.userId,
  });

  // Borrower notifications on key transitions
  if (["approved", "funded", "defaulted"].includes(newStatus)) {
    const { data: borrowerData } = await supabase
      .from("loans")
      .select(`
        loan_borrowers(
          is_primary,
          borrower:borrowers(email, user_id)
        )
      `)
      .eq("id", loanId)
      .single<{
        loan_borrowers: {
          is_primary: boolean;
          borrower: { email: string | null; user_id: string | null };
        }[];
      }>();

    const primary = borrowerData?.loan_borrowers?.find((lb) => lb.is_primary);
    if (primary?.borrower?.email) {
      const messages: Record<string, { subject: string; body: string }> = {
        approved: {
          subject: "Your loan has been approved",
          body: "Your loan application has been approved. Please review the term sheet and prepare to close.",
        },
        funded: {
          subject: "Your loan has been funded",
          body: "Your loan has been funded. Funds have been wired to closing. Your servicing begins now.",
        },
        defaulted: {
          subject: "Important: Your loan is in default",
          body: "Your loan has been marked in default. Please contact your loan officer immediately to discuss options.",
        },
      };
      const msg = messages[newStatus];
      if (msg) {
        await queueNotification(supabase, {
          channel: "email",
          recipientEmail: primary.borrower.email,
          recipientUserId: primary.borrower.user_id,
          subject: msg.subject,
          body: msg.body,
          eventType: `loan.${newStatus}`,
          relatedLoanId: loanId,
        });
      }
    }
  }

  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath("/admin/loans");
  revalidatePath("/admin");
}
