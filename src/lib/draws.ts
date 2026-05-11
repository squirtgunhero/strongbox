"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  remainingHoldback,
  validateDrawAmount,
  requiresDualApproval,
} from "@/lib/calculations/holdback";
import { queueNotification } from "@/lib/notifications";

export async function requestDraw(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const amount = parseFloat(formData.get("amount") as string);
  const notes = (formData.get("notes") as string) || null;

  // Validate against remaining holdback
  const { data: property } = await supabase
    .from("loans")
    .select("property:properties(rehab_budget)")
    .eq("id", loanId)
    .single<{ property: { rehab_budget: number } | null }>();

  const rehabBudget = Number(property?.property?.rehab_budget) || 0;

  const { data: existingDraws } = await supabase
    .from("draws")
    .select("status, approved_amount")
    .eq("loan_id", loanId);

  const remaining = remainingHoldback(rehabBudget, existingDraws || []);
  validateDrawAmount(amount, remaining);

  const { data: draw, error } = await supabase
    .from("draws")
    .insert({
      loan_id: loanId,
      requested_amount: amount,
      status: "requested",
      requested_by: user.id,
      notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Parse and insert line items if present
  const lineItemsJson = formData.get("line_items") as string;
  if (lineItemsJson) {
    try {
      const items = JSON.parse(lineItemsJson) as {
        description: string;
        amount: number;
      }[];
      if (items.length > 0) {
        const inserts = items
          .filter((i) => i.description && i.amount > 0)
          .map((i) => ({
            draw_id: draw.id,
            description: i.description,
            amount: i.amount,
          }));
        if (inserts.length > 0) {
          await supabase.from("draw_line_items").insert(inserts);
        }
      }
    } catch {
      // ignore malformed
    }
  }

  await supabase.from("audit_log").insert({
    table_name: "draws",
    record_id: draw.id,
    action: "insert",
    new_values: { loan_id: loanId, requested_amount: amount },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath(`/portal/loans/${loanId}`);
  revalidatePath("/admin/draws");
  revalidatePath("/portal/draws");
}

export async function recordInspection(drawId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: draw, error } = await supabase
    .from("draws")
    .update({
      status: "inspected",
      inspection_completed_at: new Date().toISOString(),
      inspector_notes: notes,
      inspector_id: user.id,
    })
    .eq("id", drawId)
    .eq("status", "requested") // only from requested
    .select("loan_id")
    .single();

  if (error || !draw) throw new Error("Inspection could not be recorded");

  await supabase.from("audit_log").insert({
    table_name: "draws",
    record_id: drawId,
    action: "status_change",
    old_values: { status: "requested" },
    new_values: { status: "inspected" },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}

export async function approveDraw(drawId: string, approvedAmount: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: draw } = await supabase
    .from("draws")
    .select("status, requested_amount, loan_id, inspection_required")
    .eq("id", drawId)
    .single();

  if (!draw) throw new Error("Draw not found");

  // Must be inspected (or not require inspection) before approval
  if (
    draw.status !== "inspected" &&
    !(draw.status === "requested" && !draw.inspection_required)
  ) {
    throw new Error("Draw must be inspected before approval");
  }

  // Validate against current holdback
  const { data: property } = await supabase
    .from("loans")
    .select("property:properties(rehab_budget)")
    .eq("id", draw.loan_id)
    .single<{ property: { rehab_budget: number } | null }>();

  const { data: existingDraws } = await supabase
    .from("draws")
    .select("status, approved_amount")
    .eq("loan_id", draw.loan_id)
    .neq("id", drawId);

  const remaining = remainingHoldback(
    Number(property?.property?.rehab_budget) || 0,
    existingDraws || []
  );
  validateDrawAmount(approvedAmount, remaining);

  // Record the approval (append-only, will fail uniqueness if same approver twice)
  const { error: approvalError } = await supabase.from("draw_approvals").insert({
    draw_id: drawId,
    approver_id: user.id,
  });
  if (approvalError) {
    if (approvalError.code === "23505") {
      throw new Error("You have already approved this draw");
    }
    throw new Error(approvalError.message);
  }

  // Count approvals
  const { count } = await supabase
    .from("draw_approvals")
    .select("*", { count: "exact", head: true })
    .eq("draw_id", drawId);

  const approvalsNeeded = requiresDualApproval(approvedAmount) ? 2 : 1;

  if ((count || 0) >= approvalsNeeded) {
    await supabase
      .from("draws")
      .update({
        status: "approved",
        approved_amount: approvedAmount,
      })
      .eq("id", drawId);

    await supabase.from("audit_log").insert({
      table_name: "draws",
      record_id: drawId,
      action: "status_change",
      new_values: { status: "approved", approved_amount: approvedAmount },
      performed_by: user.id,
    });
  } else {
    await supabase.from("audit_log").insert({
      table_name: "draws",
      record_id: drawId,
      action: "update",
      new_values: { approval_count: count, approvals_needed: approvalsNeeded },
      performed_by: user.id,
    });
  }

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}

export async function disburseDraw(drawId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: draw, error } = await supabase
    .from("draws")
    .update({
      status: "funded",
      funded_at: new Date().toISOString(),
      funded_by: user.id,
    })
    .eq("id", drawId)
    .eq("status", "approved") // only from approved
    .select("loan_id, approved_amount")
    .single();

  if (error || !draw) {
    throw new Error("Draw must be approved before disbursement");
  }

  // Audit the disbursement specifically — per non-negotiables every disbursement is logged
  await supabase.from("audit_log").insert({
    table_name: "draws",
    record_id: drawId,
    action: "disbursement",
    new_values: { amount: draw.approved_amount },
    performed_by: user.id,
  });

  // Notify borrower
  const { data: borrowerData } = await supabase
    .from("loans")
    .select(`
      loan_borrowers(
        is_primary,
        borrower:borrowers(email, user_id)
      )
    `)
    .eq("id", draw.loan_id)
    .single<{
      loan_borrowers: {
        is_primary: boolean;
        borrower: { email: string | null; user_id: string | null };
      }[];
    }>();
  const primary = borrowerData?.loan_borrowers?.find((lb) => lb.is_primary);
  if (primary?.borrower?.email) {
    await queueNotification(supabase, {
      channel: "email",
      recipientEmail: primary.borrower.email,
      recipientUserId: primary.borrower.user_id,
      subject: `Draw of $${Number(draw.approved_amount).toLocaleString()} disbursed`,
      body: `Your draw request has been disbursed. Funds should arrive in your account within 1-3 business days.`,
      eventType: "draw.disbursed",
      relatedLoanId: draw.loan_id,
    });
  }

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}

export async function rejectDraw(drawId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: draw, error } = await supabase
    .from("draws")
    .update({
      status: "rejected",
      rejected_reason: reason,
    })
    .eq("id", drawId)
    .in("status", ["requested", "inspected", "approved"])
    .select("loan_id")
    .single();

  if (error || !draw) throw new Error("Draw could not be rejected");

  await supabase.from("audit_log").insert({
    table_name: "draws",
    record_id: drawId,
    action: "status_change",
    new_values: { status: "rejected", reason },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}
