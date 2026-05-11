import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { accruedInterest } from "@/lib/calculations/interest";
import { sendPendingNotifications } from "@/lib/notifications";
import type { DayCountConvention } from "@/lib/types";

/**
 * Generates statements for the previous calendar month.
 * Intended to be hit by Vercel Cron, GitHub Actions, or a Supabase pg_cron
 * job once per month. Authenticates via the CRON_SECRET header.
 *
 * Suggested Vercel cron schedule (vercel.json):
 *   { "path": "/api/cron/monthly-statements", "schedule": "0 12 1 * *" }
 *   → runs at noon UTC on the 1st of every month
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || secret !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Use service role for cron — bypasses RLS. Without it, no auth.uid().
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return new Response("Service role not configured", { status: 500 });
  }

  const supabase = createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  // Previous calendar month
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const periodStart = toIso(start);
  const periodEnd = toIso(end);

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, current_principal, interest_rate, day_count,
      loan_borrowers(is_primary, borrower:borrowers(email, user_id))
    `)
    .in("status", ["funded", "active"]);

  let generated = 0;
  let skipped = 0;

  for (const loan of loans || []) {
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

    const interestDue = accruedInterest(
      Number(loan.current_principal),
      Number(loan.interest_rate),
      loan.day_count as DayCountConvention,
      periodStart,
      periodEnd
    );

    await supabase.from("notifications").insert({
      channel: "email",
      status: "pending",
      recipient_email: primary.borrower.email,
      recipient_user_id: primary.borrower.user_id,
      subject: `Statement for ${periodStart} – ${periodEnd}`,
      body: `Your monthly statement is ready. Interest due for the period: $${interestDue.toFixed(2)}. View at /documents/${loan.id}/statement?from=${periodStart}&to=${periodEnd}`,
      event_type: "statement.monthly",
      related_loan_id: loan.id,
    });
    generated++;
  }

  await supabase.from("audit_log").insert({
    table_name: "notifications",
    record_id: "00000000-0000-0000-0000-000000000000",
    action: "insert",
    new_values: {
      batch: "monthly_statements_cron",
      period_start: periodStart,
      period_end: periodEnd,
      generated,
      skipped,
    },
  });

  // Drain the pending notifications now (best-effort)
  const delivery = await sendPendingNotifications(supabase, generated);

  return Response.json({
    generated,
    skipped,
    sent: delivery.sent,
    failed: delivery.failed,
    periodStart,
    periodEnd,
  });
}

export async function GET(request: NextRequest) {
  // Some cron services (Vercel) only do GET — accept both
  return POST(request);
}
