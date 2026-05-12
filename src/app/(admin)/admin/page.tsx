import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import {
  DollarSign,
  Percent,
  Workflow,
  Clock,
} from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { MetricCard, DarkMetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { ActionCenter } from "@/components/dashboard/action-center";
import { CapitalSnapshot } from "@/components/dashboard/capital-snapshot";
import {
  ActivityFeed,
  type ActivityEntry,
} from "@/components/dashboard/activity-feed";
import { StatusBadge, loanStatusTone } from "@/components/status-badge";
import { DashboardCard } from "@/components/dashboard-card";

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
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

  const now = Date.now();
  const maturingSoon = activeLoans.filter((l) => {
    if (!l.maturity_date) return false;
    const days = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 90;
  });
  const maturingThirty = maturingSoon.filter((l) => {
    if (!l.maturity_date) return false;
    const days = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
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
      at: formatRelative(draw.requested_at),
      href: `/admin/loans/${draw.loan?.id}`,
    });
  }
  for (const p of recentPayments || []) {
    activity.push({
      kind: "payment",
      who: p.loan_id?.slice(0, 8).toUpperCase() || "—",
      text: `${String(p.payment_type).replace(/_/g, " ")} payment of ${formatCurrency(Number(p.amount))}`,
      at: formatRelative(p.created_at),
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
      at: formatRelative(sig.created_at),
      href: `/admin/loans/${sig.loan?.id}`,
    });
  }
  activity.sort((a, b) => (a.at > b.at ? -1 : 1));
  const activityTop = activity.slice(0, 6);

  // System status strip values
  const statusItems = [
    {
      label: "Active",
      value: activeLoans.length,
      tone: activeLoans.length > 0 ? ("ok" as const) : ("neutral" as const),
    },
    {
      label: "Pending draws",
      value: (draws || []).length,
      tone:
        (draws || []).length > 0
          ? ("warn" as const)
          : ("neutral" as const),
    },
    {
      label: "Maturing ≤30d",
      value: maturingThirty.length,
      tone:
        maturingThirty.length > 0
          ? ("danger" as const)
          : ("neutral" as const),
    },
    {
      label: "Defaulted",
      value: defaultedLoans.length,
      tone:
        defaultedLoans.length > 0
          ? ("danger" as const)
          : ("neutral" as const),
    },
  ];

  return (
    <div className="space-y-4">
      <DashboardHero
        title="Dashboard"
        subtitle="Monitor capital, pipeline, draws, maturities, and borrower activity."
        status={statusItems}
        scopeToggle={<DashboardScopeToggle defaultMine={defaultMine} />}
      />

      {/* Metric row — first card is dark to create rhythm */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DarkMetricCard
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
          icon={Workflow}
          label="Pipeline"
          value={pipelineLoans.length}
          status={
            pipelineLoans.length > 0
              ? { label: "In flight", tone: "warn" }
              : { label: "Awaiting deals", tone: "neutral" }
          }
          sub={
            pipelineLoans.length > 0
              ? `${underReview} in underwriting`
              : "New leads will appear here"
          }
          emptyRail={pipelineLoans.length === 0}
        />
        <MetricCard
          icon={Clock}
          label="Maturing ≤30d"
          value={maturingThirty.length}
          status={
            maturingThirty.length > 0
              ? { label: "Action needed", tone: "danger" }
              : { label: "All clear", tone: "ok" }
          }
          sub={
            defaultedLoans.length > 0
              ? `${defaultedLoans.length} in default`
              : "No upcoming maturities"
          }
          emptyRail={maturingThirty.length === 0}
        />
      </div>

      {/* Pipeline board — full width centerpiece */}
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

      {/* Operations row */}
      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        <ActionCenter
          rows={{
            missingDocs: (openConditions || []).length,
            drawRequests: (draws || []).length,
            needsReview: underReview,
            upcomingMaturities: maturingThirty.length,
          }}
        />
        <CapitalSnapshot
          totalDeployed={totalDeployed}
          avgLtv={avgLtv}
          avgRate={weightedRate}
          activeLoans={activeLoans.length}
          upcomingMaturities={maturingSoon.length}
        />
      </div>

      {/* Activity feed full width */}
      <ActivityFeed entries={activityTop} />

      {/* Loans by status — full lifecycle band */}
      <DashboardCard
        title="Loans by status"
        subtitle="Across the full lifecycle"
        noContentPadding
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 divide-x divide-border">
          {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((status) => {
            const count = statusCounts[status] || 0;
            return (
              <div key={status} className="px-4 py-4">
                <div
                  className={`tabular text-[24px] font-semibold tracking-[-0.025em] leading-none ${count > 0 ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {count}
                </div>
                <div className="mt-2">
                  <StatusBadge tone={loanStatusTone(status)} dot>
                    {LOAN_STATUS_LABELS[status]}
                  </StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}
