"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { applyWaterfall } from "@/lib/calculations/waterfall";
import { accruedInterest } from "@/lib/calculations/interest";
import { investorShareOfInterest } from "@/lib/calculations/distributions";
import { queueNotification } from "@/lib/notifications";
import type { DayCountConvention } from "@/lib/types";

export async function recordPayment(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const amount = parseFloat(formData.get("amount") as string);
  const paymentType = formData.get("payment_type") as string;
  const dueDate = formData.get("due_date") as string;
  const receivedDate = (formData.get("received_date") as string) || dueDate;

  // Load loan to compute interest accrued through received_date
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("current_principal, interest_rate, default_rate, day_count, is_defaulted, funded_date")
    .eq("id", loanId)
    .single();
  if (loanError || !loan) throw new Error("Loan not found");

  // Determine paid-through date: latest received_date of prior interest payments,
  // falling back to funded_date.
  const { data: lastInterestPayment } = await supabase
    .from("payments")
    .select("received_date, due_date")
    .eq("loan_id", loanId)
    .gt("applied_to_interest", 0)
    .order("received_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const paidThrough =
    lastInterestPayment?.received_date ||
    lastInterestPayment?.due_date ||
    loan.funded_date ||
    receivedDate;

  // Interest due = accrued from paid-through to received_date
  const effectiveRate =
    loan.is_defaulted && loan.default_rate
      ? Number(loan.default_rate)
      : Number(loan.interest_rate);

  const interestDue = accruedInterest(
    Number(loan.current_principal),
    effectiveRate,
    loan.day_count as DayCountConvention,
    paidThrough,
    receivedDate
  );

  // Outstanding late fees = late fee rows that haven't been received yet,
  // minus prior payments applied to late fees.
  const { data: lateFeeRows } = await supabase
    .from("payments")
    .select("amount, received_date, applied_to_late_fees, payment_type")
    .eq("loan_id", loanId);

  const lateFeesAssessed = (lateFeeRows || [])
    .filter((r) => r.payment_type === "late_fee" && r.received_date === null)
    .reduce((s, r) => s + Number(r.amount), 0);
  const lateFeesPaid = (lateFeeRows || []).reduce(
    (s, r) => s + Number(r.applied_to_late_fees || 0),
    0
  );
  const lateFeesDue = Math.max(0, lateFeesAssessed - lateFeesPaid);

  const result = applyWaterfall({
    amount,
    lateFeesDue,
    defaultInterestDue: 0,
    interestDue,
    escrowDue: 0,
    principalBalance: Number(loan.current_principal),
  });

  const { data: insertedPayment, error: insertError } = await supabase
    .from("payments")
    .insert({
      loan_id: loanId,
      payment_type: paymentType,
      amount,
      applied_to_late_fees: result.applied_to_late_fees,
      applied_to_default_interest: result.applied_to_default_interest,
      applied_to_interest: result.applied_to_interest,
      applied_to_escrow: result.applied_to_escrow,
      applied_to_principal: result.applied_to_principal,
      due_date: dueDate,
      received_date: receivedDate,
      notes: (formData.get("notes") as string) || null,
      recorded_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  // Auto-distribute interest to investors based on their position percentages.
  if (result.applied_to_interest > 0) {
    const { data: positions } = await supabase
      .from("investor_positions")
      .select(`
        investor_id,
        percentage,
        investor:investors(email, user_id, full_name, entity_name, investor_type)
      `)
      .eq("loan_id", loanId);

    if (positions && positions.length > 0) {
      const typed = positions as unknown as {
        investor_id: string;
        percentage: number;
        investor: {
          email: string;
          user_id: string | null;
          full_name: string | null;
          entity_name: string | null;
          investor_type: string;
        };
      }[];

      const distRows = typed
        .map((p) => ({
          investor_id: p.investor_id,
          loan_id: loanId,
          payment_id: insertedPayment.id,
          amount: investorShareOfInterest(
            result.applied_to_interest,
            Number(p.percentage)
          ),
          distribution_date: receivedDate,
        }))
        .filter((r) => r.amount > 0);

      if (distRows.length > 0) {
        await supabase.from("investor_distributions").insert(distRows);

        // Notify each investor
        for (let i = 0; i < typed.length; i++) {
          const pos = typed[i];
          const share = investorShareOfInterest(
            result.applied_to_interest,
            Number(pos.percentage)
          );
          if (share <= 0 || !pos.investor?.email) continue;
          await queueNotification(supabase, {
            channel: "email",
            recipientEmail: pos.investor.email,
            recipientUserId: pos.investor.user_id,
            subject: `Distribution of $${share.toFixed(2)} received`,
            body: `A distribution of $${share.toFixed(2)} from a loan you have a position in was recorded on ${receivedDate}. View details in your investor portal.`,
            eventType: "investor.distribution",
            relatedLoanId: loanId,
          });
        }
      }
    }
  }

  // Update principal balance
  if (result.applied_to_principal > 0) {
    await supabase
      .from("loans")
      .update({
        current_principal:
          Number(loan.current_principal) - result.applied_to_principal,
      })
      .eq("id", loanId);
  }

  // If principal goes to zero (full payoff), mark loan paid_off
  if (
    Number(loan.current_principal) - result.applied_to_principal <= 0.01 &&
    result.applied_to_principal > 0
  ) {
    await supabase.from("loans").update({ status: "paid_off" }).eq("id", loanId);
  }

  await supabase.from("audit_log").insert({
    table_name: "payments",
    record_id: loanId,
    action: "insert",
    new_values: { payment_type: paymentType, amount, applied: result },
    performed_by: user.id,
  });

  // Optionally link to a borrower payment intent and mark it cleared
  const matchIntentId = formData.get("match_intent_id") as string;
  if (matchIntentId && matchIntentId !== "none" && insertedPayment) {
    await supabase
      .from("payment_intents")
      .update({
        status: "cleared",
        matched_payment_id: insertedPayment.id,
      })
      .eq("id", matchIntentId);

    await supabase.from("audit_log").insert({
      table_name: "payment_intents",
      record_id: matchIntentId,
      action: "status_change",
      new_values: { status: "cleared", matched_payment_id: insertedPayment.id },
      performed_by: user.id,
    });
  }

  revalidatePath(`/admin/loans/${loanId}`);
}
