import { NextRequest } from "next/server";
import {
  createUnscopedAdminClient,
  createOrgAdminClient,
} from "@/lib/supabase/admin";
import { accruedInterestWithDefault } from "@/lib/calculations/interest";
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

  // This cron runs across ALL orgs. The loan SELECT is an inherently
  // cross-org platform read, so it uses the unscoped client. Every WRITE
  // (notifications, audit) is routed through a per-org scoped client so
  // org_id is stamped and the enforce_org_id trigger is satisfied.
  const unscoped = createUnscopedAdminClient();
  if (!unscoped) {
    return new Response("Service role not configured", { status: 500 });
  }

  const orgClients = new Map<
    string,
    NonNullable<ReturnType<typeof createOrgAdminClient>>
  >();
  const clientFor = (orgId: string) => {
    let c = orgClients.get(orgId);
    if (!c) {
      const created = createOrgAdminClient(orgId);
      if (!created) throw new Error("Service role not configured");
      c = created;
      orgClients.set(orgId, c);
    }
    return c;
  };

  // Previous calendar month
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const periodStart = toIso(start);
  const periodEnd = toIso(end);

  const { data: loans } = await unscoped
    .from("loans")
    .select(`
      id, org_id, current_principal, interest_rate, default_rate, default_date, day_count,
      loan_borrowers(is_primary, borrower:borrowers(email, user_id))
    `)
    .in("status", ["funded", "active", "defaulted"]);

  let generated = 0;
  let skipped = 0;
  // Per-org tallies so each org gets its own audit summary row.
  const perOrg = new Map<string, { generated: number; skipped: number }>();
  const tally = (orgId: string, key: "generated" | "skipped") => {
    const t = perOrg.get(orgId) || { generated: 0, skipped: 0 };
    t[key]++;
    perOrg.set(orgId, t);
  };

  for (const loan of loans || []) {
    const orgId = (loan as unknown as { org_id: string }).org_id;
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
      tally(orgId, "skipped");
      continue;
    }

    // Use the split-period helper so loans that crossed into default during
    // the period are billed correctly: pre-default days at the note rate,
    // post-default days at the elevated default rate.
    const interestDue = accruedInterestWithDefault(
      Number(loan.current_principal),
      Number(loan.interest_rate),
      loan.day_count as DayCountConvention,
      periodStart,
      periodEnd,
      {
        defaultDate: loan.default_date as string | null,
        defaultRate: loan.default_rate as number | null,
      }
    );

    await clientFor(orgId).from("notifications").insert({
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
    tally(orgId, "generated");
  }

  // One audit summary row per org that had activity (audit_log is org-scoped
  // and append-only; record_id = the org's id; no user → performed_by null).
  for (const [orgId, counts] of perOrg) {
    await clientFor(orgId).from("audit_log").insert({
      table_name: "notifications",
      record_id: orgId,
      action: "insert",
      new_values: {
        batch: "monthly_statements_cron",
        period_start: periodStart,
        period_end: periodEnd,
        generated: counts.generated,
        skipped: counts.skipped,
        actor: { system: "monthly_statements_cron" },
      },
      performed_by: null,
    });
  }

  // Drain the pending notifications now (best-effort)
  const delivery = await sendPendingNotifications(generated);

  return Response.json({
    generated,
    skipped,
    sent: delivery.sent,
    failed: delivery.failed,
    periodStart,
    periodEnd,
  });
}

// Intentionally no GET handler. Side-effecting cron logic must run via POST
// so the CRON_SECRET never appears in a referrer/proxy log as a URL fragment
// and so accidental browser navigations cannot re-fire statement generation.
// Vercel Cron supports POST when method is declared in vercel.json:
//   { "path": "/api/cron/monthly-statements", "schedule": "0 12 1 * *", "method": "POST" }
