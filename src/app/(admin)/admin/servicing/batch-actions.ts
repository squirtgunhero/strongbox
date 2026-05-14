"use server";

import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";
import { accruedInterest } from "@/lib/calculations/interest";
import { revalidatePath } from "next/cache";
import type { DayCountConvention } from "@/lib/types";
import { requireAdmin } from "@/lib/auth/require-staff";

interface BatchResult {
  generated: number;
  skipped: number;
  failed: number;
}

/**
 * Queue monthly statement notifications for all active loans for the given
 * period. The statement link points to the existing /documents/[loanId]/statement
 * route with date range query params populated.
 */
export async function generateMonthlyStatements(
  periodStart: string,
  periodEnd: string
): Promise<BatchResult> {
  const caller = await requireAdmin();
  const supabase = await createClient();

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, current_principal, interest_rate, day_count,
      loan_borrowers(is_primary, borrower:borrowers(email, user_id))
    `)
    .in("status", ["funded", "active"]);

  if (!loans || loans.length === 0) {
    return { generated: 0, skipped: 0, failed: 0 };
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const loan of loans) {
    const primary = (
      loan as unknown as {
        loan_borrowers: {
          is_primary: boolean;
          borrower: { email: string | null; user_id: string | null };
        }[];
      }
    ).loan_borrowers?.find((lb) => lb.is_primary);

    if (!primary?.borrower?.email) {
      skipped++;
      continue;
    }

    try {
      const interestDue = accruedInterest(
        Number(loan.current_principal),
        Number(loan.interest_rate),
        loan.day_count as DayCountConvention,
        periodStart,
        periodEnd
      );

      await queueNotification(supabase, {
        channel: "email",
        recipientEmail: primary.borrower.email,
        recipientUserId: primary.borrower.user_id,
        subject: `Statement for ${periodStart} – ${periodEnd}`,
        body: `Your monthly statement is ready. Interest due for the period: $${interestDue.toFixed(2)}. View your statement at /documents/${loan.id}/statement?from=${periodStart}&to=${periodEnd}`,
        eventType: "statement.monthly",
        relatedLoanId: loan.id,
      });
      generated++;
    } catch {
      failed++;
    }
  }

  await supabase.from("audit_log").insert({
    table_name: "notifications",
    record_id: "00000000-0000-0000-0000-000000000000",
    action: "insert",
    new_values: {
      batch: "monthly_statements",
      period_start: periodStart,
      period_end: periodEnd,
      generated,
      skipped,
      failed,
    },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/notifications");
  revalidatePath("/admin/servicing");
  return { generated, skipped, failed };
}
