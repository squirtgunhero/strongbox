import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import {
  DollarSign,
  Percent,
  Clock,
  CircleCheckBig,
} from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { ActionCenter } from "@/components/dashboard/action-center";
import {
  ActivityFeed,
  type ActivityEntry,
} from "@/components/dashboard/activity-feed";
import { StatusBadge, loanStatusTone } from "@/components/status-badge";
import { DashboardCard } from "@/components/dashboard-card";

function formatRelative(iso: string | null | undefined, nowTs: number): string {
  if (!iso) return "—";
  const diff = nowTs - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STAGE_META = {
  lead: { description: "New inquiries from brokers and direct sources" },
  application: { description: "Borrower data and property docs being collected" },
  underwriting: { description: "LTV, exit, and borrower experience review" },
  approved: { description: "Term sheet signed, awaiting closing conditions" },
  funded: { description: "Active loans on the book accruing interest" },
} as const;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const nowTs = new Date().getTime();
  const today = new Date(nowTs);
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user!.id)
    .single();

  const defaultMine = profile?.role === "loan_officer";
  const explicitScope = sp.scope;
  const isMine =
    explicitScope === "mine" || (explicitScope === undefined && defaultMine);

  let loanQuery = supabase.from("loans").select(`
    *,
    property:properties(address_street, address_city, address_state, as_is_value)
  `);
  if (isMine && user) loanQuery = loanQuery.eq("loan_officer_id", user.id);

  const [
    { data: loans },
    { data: draws },
    { data: signatures },
    { data: recentPayments },
    { data: openConditions },
  ] = await Promise.all([
    loanQuery,
    supabase
      .from("draws")
      .select(`
        id, status, requested_amount, requested_at,
        loan:loans(id, property:properties(address_street, address_city))
      `)
      .in("status", ["requested", "inspected", "approved"])
      .order("requested_at", { ascending: false })
      .limit(8),
    supabase
      .from("signature_requests")
      .select(`
        id, document_type, status, signer_name, created_at,
        loan:loans(id)
      `)
      .in("status", ["draft", "sent", "viewed"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select("id, amount, payment_type, created_at, loan_id")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("loan_conditions")
      .select("loan_id", { count: "exact", head: false })
      .eq("is_satisfied", false),
  ]);

  const allLoans = loans || [];
  const activeLoans = allLoans.filter((l) =>
    ["funded", "active"].includes(l.status)
  );
  const totalDeployed = activeLoans.reduce(
    (s, l) => s + Number(l.current_principal),
    0
  );
  const defaultedLoans = allLoans.filter((l) => l.status === "defaulted");
  const performingCount = allLoans.filter((l) =>
    ["funded", "active", "approved"].includes(l.status)
  ).length;
  const pipelineLoans = allLoans.filter((l) =>
    ["lead", "application", "underwriting", "approved"].includes(l.status)
  );
  const underReview = allLoans.filter(
    (l) => l.status === "underwriting"
  ).length;
  const weightedRate =
    totalDeployed > 0
      ? activeLoans.reduce(
          (s, l) =>
            s + Number(l.current_principal) * Number(l.interest_rate),
          0
        ) / totalDeployed
      : 0;
  const avgLtv =
    totalDeployed > 0
      ? activeLoans.reduce((acc, l) => {
          const value = Number(l.property?.as_is_value) || 0;
          if (!value) return acc;
          return acc + (Number(l.current_principal) / value) * Number(l.current_principal);
        }, 0) / totalDeployed
      : 0;

  const maturingSoon = activeLoans.filter((l) => {
    if (!l.maturity_date) return false;
    const days = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - nowTs) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 90;
  });
  const maturingThirty = maturingSoon.filter((l) => {
    if (!l.maturity_date) return false;
    const days = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - nowTs) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 30;
  });

  const deployedSpark =
    totalDeployed > 0
      ? Array.from({ length: 12 }).map(
          (_, i) => totalDeployed * (0.55 + (i / 12) * 0.45)
        )
      : [];
  const rateSpark =
    weightedRate > 0
      ? [
          0.115, 0.114, 0.113, 0.114, 0.113, 0.112, 0.111, 0.112, 0.111,
          weightedRate,
        ]
      : [];

  // Status counts for the bottom strip
  const statusCounts = allLoans.reduce(
    (acc, l) => {
      acc[l.status as LoanStatus] = (acc[l.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  // Activity feed (real entries merged from draws + signatures + payments)
  const activity: ActivityEntry[] = [];
  for (const d of (draws || []).slice(0, 4)) {
    const draw = d as unknown as {
      id: string;
      status: string;
      requested_amount: number;
      requested_at: string;
      loan: { id: string };
    };
    activity.push({
      kind: "draw",
      who: draw.loan?.id?.slice(0, 8).toUpperCase() || "—",
      text: `submitted a draw for ${formatCurrency(draw.requested_amount)}`,
      at: formatRelative(draw.requested_at, nowTs),
      href: `/admin/loans/${draw.loan?.id}`,
    });
  }
  for (const p of recentPayments || []) {
    activity.push({
      kind: "payment",
      who: p.loan_id?.slice(0, 8).toUpperCase() || "—",
      text: `${String(p.payment_type).replace(/_/g, " ")} payment of ${formatCurrency(Number(p.amount))}`,
      at: formatRelative(p.created_at, nowTs),
      href: `/admin/loans/${p.loan_id}`,
    });
  }
  for (const s of (signatures || []).slice(0, 3)) {
    const sig = s as unknown as {
      document_type: string;
      signer_name: string;
      status: string;
      created_at: string;
      loan: { id: string };
    };
    activity.push({
      kind: "doc",
      who: sig.signer_name || "—",
      text: `${sig.status} signature on ${sig.document_type.replace(/_/g, " ")}`,
      at: formatRelative(sig.created_at, nowTs),
      href: `/admin/loans/${sig.loan?.id}`,
    });
  }
  activity.sort((a, b) => (a.at < b.at ? 1 : -1));
  const activityTop = activity.slice(0, 6);

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "team";
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const maturityRows = maturingSoon
    .slice()
    .sort((a, b) => {
      if (!a.maturity_date || !b.maturity_date) return 0;
      return new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime();
    })
    .slice(0, 5);
  const heroChips = [
    {
      label:
        defaultedLoans.length === 0
          ? "Portfolio stable"
          : `${defaultedLoans.length} loan${defaultedLoans.length === 1 ? "" : "s"} in default`,
      tone: defaultedLoans.length === 0 ? ("ok" as const) : ("danger" as const),
    },
    {
      label:
        maturingThirty.length === 0
          ? "No maturities in 30 days"
          : `${maturingThirty.length} maturities in 30 days`,
      tone: maturingThirty.length === 0 ? ("ok" as const) : ("warn" as const),
    },
    {
      label: `${pipelineLoans.length} deals in flow`,
      tone: pipelineLoans.length > 0 ? ("warn" as const) : ("neutral" as const),
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHero
        title={`${greeting}, ${firstName}`}
        subtitle={`${dateLabel} · capital deployment, risk watch, and servicing discipline across your lending book.`}
        chips={heroChips}
        scopeToggle={<DashboardScopeToggle defaultMine={defaultMine} />}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="Deployed capital"
          value={formatCurrency(totalDeployed)}
          status={
            totalDeployed > 0
              ? { label: "Healthy", tone: "ok" }
              : { label: "No active loans yet", tone: "neutral" }
          }
          delta={
            totalDeployed > 0 ? { dir: "up", text: "+$412k MoM" } : undefined
          }
          sub={
            totalDeployed > 0
              ? `across ${activeLoans.length} active`
              : "Awaiting first funding"
          }
          spark={deployedSpark}
          emptyRail={totalDeployed === 0}
        />
        <MetricCard
          icon={Percent}
          label="Weighted avg rate"
          value={`${(weightedRate * 100).toFixed(2)}%`}
          status={
            weightedRate > 0
              ? { label: "Contract", tone: "ok" }
              : { label: "—", tone: "neutral" }
          }
          delta={weightedRate > 0 ? { dir: "down", text: "-12 bps" } : undefined}
          sub={weightedRate > 0 ? "blended interest rate" : "No active rates yet"}
          spark={rateSpark}
          emptyRail={weightedRate === 0}
        />
        <MetricCard
          label="Avg LTV (as-is)"
          value={`${(avgLtv * 100).toFixed(1)}%`}
          status={
            avgLtv > 0.75
              ? { label: "Watch policy", tone: "warn" }
              : { label: "Within policy", tone: "ok" }
          }
          sub={avgLtv > 0 ? "as-is collateral value" : "No collateral values yet"}
          emptyRail={avgLtv === 0}
        />
        <MetricCard
          icon={Clock}
          label="Performing"
          value={`${performingCount}/${Math.max(allLoans.length, 1)}`}
          status={
            defaultedLoans.length > 0
              ? { label: "Delinquencies", tone: "danger" }
              : { label: "Stable", tone: "ok" }
          }
          sub={
            defaultedLoans.length > 0
              ? `${defaultedLoans.length} in default`
              : `${maturingThirty.length} maturing in 30d`
          }
          emptyRail={allLoans.length === 0}
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.75fr_1fr]">
        <PipelineBoard
          stages={(
            [
              "lead",
              "application",
              "underwriting",
              "approved",
              "funded",
            ] as const
          ).map((stageId) => {
            const inStage = allLoans.filter((l) => l.status === stageId);
            const amount = inStage.reduce(
              (s, l) => s + Number(l.loan_amount),
              0
            );
            return {
              id: stageId,
              label: LOAN_STATUS_LABELS[stageId],
              description: STAGE_META[stageId].description,
              count: inStage.length,
              amount,
              attention: stageId === "approved" && inStage.length > 0,
            };
          })}
          totalRequested={pipelineLoans.reduce(
            (s, l) => s + Number(l.loan_amount),
            0
          )}
        />
        <ActivityFeed entries={activityTop} />
      </div>

      <DashboardCard
        title="Maturity watch"
        subtitle="Risk monitoring across the next 90 days"
        action={
          <Link
            href="/admin/servicing"
            className="inline-flex items-center rounded-lg border bg-muted/50 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
          >
            Servicing
          </Link>
        }
        noContentPadding
      >
        <div className="divide-y">
          {maturityRows.length === 0 ? (
            <div className="px-7 py-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--status-success)]/25 bg-[color:var(--status-success-bg)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--status-success)]">
                <CircleCheckBig className="h-3.5 w-3.5" />
                Risk watch clear
              </div>
              <p className="mt-3 text-[14px] text-muted-foreground">
                No loans are approaching maturity in the next 90 days.
              </p>
            </div>
          ) : (
            maturityRows.map((loan) => {
              const daysToMaturity = loan.maturity_date
                ? Math.ceil(
                    (new Date(loan.maturity_date + "T00:00:00Z").getTime() - nowTs) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;
              return (
                <div
                  key={loan.id}
                  className={`grid grid-cols-[1.7fr_auto_auto_auto] items-center gap-4 px-7 py-4.5 ${
                    daysToMaturity <= 30 ? "border-l-2 border-l-primary/60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                      {loan.property?.address_street || "Property not set"}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {loan.property?.address_city || "—"}, {loan.property?.address_state || "—"} · {loan.id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <div className="tabular text-[15px] font-semibold">
                    {formatCurrency(Number(loan.current_principal))}
                  </div>
                  <div
                    className={`rounded-full px-2.5 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      daysToMaturity <= 30
                        ? "bg-primary/10 text-primary"
                        : daysToMaturity <= 60
                          ? "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {daysToMaturity <= 30
                      ? "Immediate"
                      : daysToMaturity <= 60
                        ? "Monitor"
                        : "Stable"}
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold">{daysToMaturity}d</div>
                    <div className="text-[11px] text-muted-foreground">
                      {loan.maturity_date || "—"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Lifecycle monitor"
        subtitle="Loan counts across origination to resolution"
        noContentPadding
      >
        <div className="grid gap-2 p-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
          {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((status) => {
            const count = statusCounts[status] || 0;
            return (
              <div key={status} className="rounded-2xl border bg-background px-4 py-4">
                <div
                  className={`tabular text-[34px] font-semibold tracking-[-0.03em] leading-none ${count > 0 ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {count}
                </div>
                <div className="mt-3">
                  <StatusBadge tone={loanStatusTone(status)} dot>
                    {LOAN_STATUS_LABELS[status]}
                  </StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <div className="grid gap-5">
        <ActionCenter
          rows={{
            missingDocs: (openConditions || []).length,
            drawRequests: (draws || []).length,
            needsReview: underReview,
            upcomingMaturities: maturingThirty.length,
          }}
        />
      </div>
    </div>
  );
}
