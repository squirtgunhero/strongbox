"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  remainingHoldback,
  validateDrawAmount,
} from "@/lib/calculations/holdback";
import {
  dualApprovalDecisionAmount,
  approvalsRequired,
  assertDisburserEligible,
} from "@/lib/calculations/draw-approval";
import { getDualApprovalThreshold } from "@/lib/org-settings";
import { queueNotification } from "@/lib/notifications";
import { requireStaff } from "@/lib/auth/require-staff";

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
  const caller = await requireStaff();
  const supabase = await createClient();

  const { data: draw, error } = await supabase
    .from("draws")
    .update({
      status: "inspected",
      inspection_completed_at: new Date().toISOString(),
      inspector_notes: notes,
      inspector_id: caller.userId,
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
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}

export async function approveDraw(drawId: string, approvedAmount: number) {
  const caller = await requireStaff();
  const supabase = await createClient();

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

  // Validate against current holdback (friendly early error; the SQL
  // function is the authoritative gate on promotion).
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

  // Record the approval and (maybe) promote in ONE atomic transaction.
  // The SQL function locks the draw row, enforces requester-cannot-approve
  // and one-approval-per-person, and decides the dual-approval requirement
  // on max(requested, approved) so it can't be under-stated to dodge it.
  const { data: result, error: rpcError } = await supabase
    .rpc("approve_draw_atomic", {
      p_draw_id: drawId,
      p_approved_amount: approvedAmount,
    })
    .single<{
      promoted: boolean;
      approvals: number;
      approvals_needed: number;
    }>();

  if (rpcError) {
    if (rpcError.code === "23505") {
      throw new Error("You have already approved this draw");
    }
    throw new Error(rpcError.message);
  }

  await supabase.from("audit_log").insert({
    table_name: "draws",
    record_id: drawId,
    action: result?.promoted ? "status_change" : "update",
    new_values: result?.promoted
      ? { status: "approved", approved_amount: approvedAmount }
      : {
          approval_count: result?.approvals,
          approvals_needed: result?.approvals_needed,
        },
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}

export async function disburseDraw(drawId: string) {
  const caller = await requireStaff();
  const supabase = await createClient();

  // Load the draw and everyone who has touched it, to enforce separation
  // of duties on the actual money-out step.
  const { data: pending } = await supabase
    .from("draws")
    .select("status, requested_amount, approved_amount, requested_by, loan_id")
    .eq("id", drawId)
    .single<{
      status: string;
      requested_amount: number;
      approved_amount: number | null;
      requested_by: string | null;
      loan_id: string;
    }>();

  if (!pending || pending.status !== "approved") {
    throw new Error("Draw must be approved before disbursement");
  }

  const { data: approvalRows } = await supabase
    .from("draw_approvals")
    .select("approver_id")
    .eq("draw_id", drawId);
  const approverIds = (approvalRows || []).map((a) => a.approver_id as string);

  const threshold = await getDualApprovalThreshold(supabase);
  const decisionAmount = dualApprovalDecisionAmount(
    Number(pending.requested_amount),
    Number(pending.approved_amount ?? 0)
  );

  // Re-assert dual approval at disburse time: the threshold may have been
  // lowered in settings after this draw was approved.
  if (approverIds.length < approvalsRequired(decisionAmount, threshold)) {
    throw new Error(
      "This draw no longer has enough approvals for the current dual-approval threshold. It must be re-approved."
    );
  }

  // Above threshold, the disburser must be a distinct third party.
  assertDisburserEligible({
    disburserId: caller.userId,
    requesterId: pending.requested_by ?? "",
    approverIds,
    decisionAmount,
    threshold,
  });

  const { data: draw, error } = await supabase
    .from("draws")
    .update({
      status: "funded",
      funded_at: new Date().toISOString(),
      funded_by: caller.userId,
    })
    .eq("id", drawId)
    .eq("status", "approved") // only from approved (guards against a race)
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
    performed_by: caller.userId,
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
  const caller = await requireStaff();
  const supabase = await createClient();

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
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${draw.loan_id}`);
  revalidatePath("/admin/draws");
}
