"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { queueNotification } from "@/lib/notifications";

export async function submitPaymentIntent(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const amount = parseFloat(formData.get("amount") as string);
  const method = formData.get("method") as string;
  const sentDate = formData.get("sent_date") as string;
  const expectedArrival = (formData.get("expected_arrival_date") as string) || null;
  const referenceNumber = ((formData.get("reference_number") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  if (!(amount > 0)) throw new Error("Amount must be positive");
  if (!sentDate) throw new Error("Sent date is required");

  // Look up the borrower row for this user
  const { data: borrower } = await supabase
    .from("borrowers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: intent, error } = await supabase
    .from("payment_intents")
    .insert({
      loan_id: loanId,
      borrower_id: borrower?.id || null,
      amount,
      method,
      sent_date: sentDate,
      expected_arrival_date: expectedArrival,
      reference_number: referenceNumber,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Notify loan officer + all admins so a wire never sits unverified
  const { data: loan } = await supabase
    .from("loans")
    .select(`
      loan_officer_id,
      loan_officer:profiles!loans_loan_officer_id_fkey(email, full_name)
    `)
    .eq("id", loanId)
    .single<{
      loan_officer_id: string | null;
      loan_officer: { email: string; full_name: string } | null;
    }>();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "admin");

  const subject = `Payment notice: $${amount.toLocaleString()} via ${method}`;
  const body = `A borrower has submitted a payment notice on loan ${loanId.slice(0, 8)}. Amount: $${amount.toLocaleString()}. Method: ${method}. Reference: ${referenceNumber || "—"}. Sent: ${sentDate}. Expected: ${expectedArrival || "—"}. Verify in the admin loan detail page.`;

  // Distinct recipients (loan officer + admins)
  const recipients = new Map<string, string | null>();
  if (loan?.loan_officer?.email) {
    recipients.set(loan.loan_officer.email, loan.loan_officer_id);
  }
  for (const a of admins || []) {
    if (a.email) recipients.set(a.email, a.id);
  }

  for (const [email, userId] of recipients) {
    await queueNotification(supabase, {
      channel: "email",
      recipientEmail: email,
      recipientUserId: userId,
      subject,
      body,
      eventType: "payment_intent.submitted",
      relatedLoanId: loanId,
    });
  }

  await supabase.from("audit_log").insert({
    table_name: "payment_intents",
    record_id: intent.id,
    action: "insert",
    new_values: { amount, method, sent_date: sentDate },
    performed_by: user.id,
  });

  revalidatePath(`/portal/loans/${loanId}`);
  revalidatePath(`/admin/loans/${loanId}`);
}

export async function updatePaymentIntentStatus(
  intentId: string,
  newStatus: "verified" | "cleared" | "rejected",
  reason?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "rejected") update.rejected_reason = reason || null;

  const { data, error } = await supabase
    .from("payment_intents")
    .update(update)
    .eq("id", intentId)
    .select("loan_id")
    .single();
  if (error || !data) throw new Error(error?.message || "Failed");

  await supabase.from("audit_log").insert({
    table_name: "payment_intents",
    record_id: intentId,
    action: "status_change",
    new_values: { status: newStatus, reason },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${data.loan_id}`);
  revalidatePath(`/portal/loans/${data.loan_id}`);
}
