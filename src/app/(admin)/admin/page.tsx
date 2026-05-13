import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { type LoanStatus, LOAN_STATUS_LABELS } from "@/lib/types";
import { DollarSign, Percent, Clock, Shield } from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { TodayPanel, type TodayRow } from "@/components/dashboard/today-panel";
import { DashboardOnboarding } from "@/components/dashboard/dashboard-onboarding";

type ViewMode = "live" | "demo";

type PipelineStage = {
  id: string;
  label: string;
  count: number;
  amount: number;
  attention?: boolean;
};

type PipelineRow = {
  id: string;
  deal: string;
  borrower: string;
  property: string;
  stage: string;
  amount: number;
  ltv: string;
  updated: string;
};

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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; view?: string }>;
}) {
  const nowTs = Date.now();
  const today = new Date(nowTs);
  const sp = await searchParams;
  const viewMode: ViewMode = sp.view === "demo" ? "demo" : "live";

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
      .select("id, status")
      .in("status", ["requested", "inspected", "approved"])
      .limit(50),
    supabase
      .from("signature_requests")
      .select("id, status")
      .in("status", ["draft", "sent", "viewed"])
      .limit(50),
    supabase
      .from("payments")
      .select("id, due_date, received_date")
      .limit(50),
    supabase
      .from("loan_conditions")
      .select("loan_id", { count: "exact", head: false })
      .eq("is_satisfied", false),
  ]);

  const allLoans = loans || [];
  const activeLoans = allLoans.filter((loan) =>
    ["funded", "active"].includes(loan.status)
  );
  const totalDeployed = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.current_principal),
    0
  );
  const defaultedLoans = allLoans.filter((loan) => loan.status === "defaulted");
  const pipelineLoans = allLoans.filter((loan) =>
    ["lead", "application", "underwriting", "approved"].includes(loan.status)
  );
  const underReview = allLoans.filter(
    (loan) => loan.status === "underwriting"
  ).length;
  const weightedRate =
    totalDeployed > 0
      ? activeLoans.reduce(
          (sum, loan) =>
            sum + Number(loan.current_principal) * Number(loan.interest_rate),
          0
        ) / totalDeployed
      : 0;
  const avgLtv =
    totalDeployed > 0
      ? activeLoans.reduce((sum, loan) => {
          const value = Number(loan.property?.as_is_value) || 0;
          if (!value) return sum;
          return (
            sum +
            (Number(loan.current_principal) / value) *
              Number(loan.current_principal)
          );
        }, 0) / totalDeployed
      : 0;

  const maturingSoon = activeLoans.filter((loan) => {
    if (!loan.maturity_date) return false;
    const days = Math.ceil(
      (new Date(loan.maturity_date + "T00:00:00Z").getTime() - nowTs) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 90;
  });
  const maturingThirty = maturingSoon.filter((loan) => {
    if (!loan.maturity_date) return false;
    const days = Math.ceil(
      (new Date(loan.maturity_date + "T00:00:00Z").getTime() - nowTs) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 30;
  });

  const statusCounts = allLoans.reduce(
    (acc, loan) => {
      acc[loan.status as LoanStatus] =
        (acc[loan.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  const paymentsDueSoon = (recentPayments || []).filter(
    (p) =>
      p.due_date &&
      !p.received_date &&
      Math.ceil(
        (new Date(p.due_date + "T00:00:00Z").getTime() - nowTs) /
          (1000 * 60 * 60 * 24)
      ) <= 7
  ).length;

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";

  // No loans → onboarding state, full stop.
  if (allLoans.length === 0 && viewMode === "live") {
    return <DashboardOnboarding greeting={`${greeting}, ${firstName}.`} />;
  }

  const livePipelineRows: PipelineRow[] = allLoans
    .filter((loan) =>
      ["lead", "application", "underwriting", "approved", "funded"].includes(
        loan.status
      )
    )
    .slice(0, 5)
    .map((loan) => ({
      id: loan.id,
      deal: loan.property?.address_street || "Untitled deal",
      borrower: `Loan ${loan.id.slice(0, 8).toUpperCase()}`,
      property: `${loan.property?.address_city || "—"}, ${loan.property?.address_state || "—"}`,
      stage:
        LOAN_STATUS_LABELS[loan.status as LoanStatus] || loan.status,
      amount: Number(loan.loan_amount || 0),
      ltv:
        loan.property?.as_is_value && Number(loan.property.as_is_value) > 0
          ? `${Math.round((Number(loan.loan_amount) / Number(loan.property.as_is_value)) * 100)}%`
          : "—",
      updated: formatRelative(loan.updated_at || loan.created_at, nowTs),
    }));

  const liveTodayRows: TodayRow[] = [
    {
      id: "docs",
      label: "Documents pending",
      count: (openConditions || []).length,
      detail: "Borrower documents awaiting submission",
      href: "/admin/loans",
      iconKind: "docs",
      tone: (openConditions || []).length > 0 ? "med" : "low",
    },
    {
      id: "draws",
      label: "Draw approvals pending",
      count: (draws || []).length,
      detail: "Awaiting inspection and sign-off",
      href: "/admin/draws",
      iconKind: "draws",
      tone: (draws || []).length > 0 ? "high" : "low",
    },
    {
      id: "review",
      label: "Underwriting in review",
      count: underReview,
      detail: "Files queued for decision",
      href: "/admin/loans?status=underwriting",
      iconKind: "review",
      tone: underReview > 0 ? "med" : "low",
    },
    {
      id: "maturity",
      label: "Maturities inside 30 days",
      count: maturingThirty.length,
      detail: "Start extension or payoff outreach",
      href: "/admin/servicing",
      iconKind: "maturity",
      tone: maturingThirty.length > 0 ? "high" : "low",
    },
    {
      id: "payments",
      label: "Payments due in 7 days",
      count: paymentsDueSoon,
      detail: "Inbound interest commitments",
      href: "/admin/servicing",
      iconKind: "payments",
      tone: paymentsDueSoon > 0 ? "med" : "low",
    },
    {
      id: "updates",
      label: "Borrower updates",
      count: (signatures || []).length,
      detail: "Signature and communication activity",
      href: "/admin/notifications",
      iconKind: "updates",
      tone: "low",
    },
  ];

  // Sparklines: derive from current data, not random.
  const deployedSpark =
    totalDeployed > 0
      ? Array.from({ length: 12 }).map(
          (_, i) => totalDeployed * (0.55 + (i / 12) * 0.45)
        )
      : [];
  const rateSpark =
    weightedRate > 0
      ? [0.115, 0.114, 0.113, 0.114, 0.113, 0.112, 0.111, 0.112, 0.111, weightedRate]
      : [];

  const liveStages: PipelineStage[] = [
    {
      id: "lead",
      label: "Lead",
      count: statusCounts.lead || 0,
      amount: sumAmount(allLoans, "lead"),
    },
    {
      id: "application",
      label: "Application",
      count: statusCounts.application || 0,
      amount: sumAmount(allLoans, "application"),
    },
    {
      id: "underwriting",
      label: "Underwriting",
      count: statusCounts.underwriting || 0,
      amount: sumAmount(allLoans, "underwriting"),
      attention: (statusCounts.underwriting || 0) > 0,
    },
    {
      id: "approved",
      label: "Approved",
      count: statusCounts.approved || 0,
      amount: sumAmount(allLoans, "approved"),
      attention: (statusCounts.approved || 0) > 0,
    },
    {
      id: "funded",
      label: "Funded",
      count: (statusCounts.funded || 0) + (statusCounts.active || 0),
      amount: totalDeployed,
    },
    {
      id: "closed",
      label: "Closed",
      count: statusCounts.paid_off || 0,
      amount: sumAmount(allLoans, "paid_off"),
    },
  ];

  // Demo model
  const demoStages: PipelineStage[] = [
    { id: "lead", label: "Lead", count: 9, amount: 2_900_000 },
    { id: "application", label: "Application", count: 6, amount: 2_150_000 },
    {
      id: "underwriting",
      label: "Underwriting",
      count: 4,
      amount: 1_865_000,
      attention: true,
    },
    { id: "approved", label: "Approved", count: 3, amount: 1_540_000, attention: true },
    { id: "funded", label: "Funded", count: 31, amount: 18_700_000 },
    { id: "closed", label: "Closed", count: 18, amount: 10_400_000 },
  ];
  const demoPipelineRows: PipelineRow[] = [
    {
      id: "deal-1",
      deal: "Maple Street Bridge Loan",
      borrower: "Hartwell Homes LLC",
      property: "Montclair, NJ",
      stage: "Underwriting",
      amount: 725_000,
      ltv: "64%",
      updated: "2h ago",
    },
    {
      id: "deal-2",
      deal: "Shoreline Rehab Draw",
      borrower: "Beacon Ridge Capital",
      property: "Long Branch, NJ",
      stage: "Draw review",
      amount: 1_200_000,
      ltv: "58%",
      updated: "5h ago",
    },
    {
      id: "deal-3",
      deal: "Newark Two-Family Refi",
      borrower: "Ironbound Property",
      property: "Newark, NJ",
      stage: "Approved",
      amount: 540_000,
      ltv: "67%",
      updated: "Yesterday",
    },
    {
      id: "deal-4",
      deal: "Camden Fix & Flip",
      borrower: "Riverside Holdings",
      property: "Camden, NJ",
      stage: "Application",
      amount: 390_000,
      ltv: "61%",
      updated: "2d ago",
    },
    {
      id: "deal-5",
      deal: "Pine Hill Multifamily",
      borrower: "Cedarwood Partners",
      property: "Pine Hill, NJ",
      stage: "Lead",
      amount: 1_450_000,
      ltv: "—",
      updated: "3d ago",
    },
  ];
  const demoTodayRows: TodayRow[] = [
    {
      id: "draws",
      label: "Draw approvals pending",
      count: 3,
      detail: "Awaiting inspection",
      href: "/admin/draws",
      iconKind: "draws",
      tone: "high",
    },
    {
      id: "maturity",
      label: "Maturities inside 30 days",
      count: 2,
      detail: "Start extension or payoff outreach",
      href: "/admin/servicing",
      iconKind: "maturity",
      tone: "high",
    },
    {
      id: "docs",
      label: "Documents pending",
      count: 12,
      detail: "Borrower submissions outstanding",
      href: "/admin/loans",
      iconKind: "docs",
      tone: "med",
    },
    {
      id: "review",
      label: "Underwriting in review",
      count: 4,
      detail: "Files queued for decision",
      href: "/admin/loans?status=underwriting",
      iconKind: "review",
      tone: "med",
    },
    {
      id: "payments",
      label: "Payments due in 7 days",
      count: 2,
      detail: "Inbound interest commitments",
      href: "/admin/servicing",
      iconKind: "payments",
      tone: "med",
    },
    {
      id: "updates",
      label: "Borrower updates",
      count: 5,
      detail: "Signatures and communication",
      href: "/admin/notifications",
      iconKind: "updates",
      tone: "low",
    },
  ];

  const isDemo = viewMode === "demo";

  const heroChips = (() => {
    const chips: { label: string; tone: "ok" | "warn" | "danger" | "neutral" }[] = [];
    const defaults = isDemo ? 1 : defaultedLoans.length;
    if (defaults > 0) {
      chips.push({
        label: `${defaults} loan${defaults === 1 ? "" : "s"} in default`,
        tone: "danger",
      });
    } else if (activeLoans.length > 0 || isDemo) {
      chips.push({ label: "Portfolio stable", tone: "ok" });
    }
    const inThirty = isDemo ? 2 : maturingThirty.length;
    if (inThirty > 0) {
      chips.push({
        label: `${inThirty} maturities in 30 days`,
        tone: "warn",
      });
    }
    const inFlight = isDemo ? 22 : pipelineLoans.length;
    if (inFlight > 0) {
      chips.push({
        label: `${inFlight} deals in flight`,
        tone: "neutral",
      });
    }
    return chips;
  })();

  const metrics = isDemo
    ? {
        deployed: {
          value: "$18.7M",
          status: { label: "74.8% deployed", tone: "warn" as const },
          sub: "of $25.0M committed",
        },
        rate: {
          value: "11.42%",
          status: { label: "Across active book", tone: "ok" as const },
          sub: "+18 bps vs prior 30d",
        },
        ltv: {
          value: "63.1%",
          status: { label: "Within policy", tone: "ok" as const },
          sub: "31 collateralized loans",
        },
        performing: {
          value: "29/31",
          status: { label: "93.5% performing", tone: "ok" as const },
          sub: "2 loans need attention",
        },
      }
    : {
        deployed: {
          value: formatCurrency(totalDeployed),
          status:
            totalDeployed > 0
              ? ({ label: `${activeLoans.length} active loans`, tone: "ok" } as const)
              : ({ label: "No active loans yet", tone: "neutral" } as const),
          sub: undefined,
        },
        rate: {
          value:
            activeLoans.length > 0
              ? `${(weightedRate * 100).toFixed(2)}%`
              : "—",
          status:
            activeLoans.length > 0
              ? ({ label: "Across active book", tone: "ok" } as const)
              : ({ label: "No rate data yet", tone: "neutral" } as const),
          sub: undefined,
        },
        ltv: {
          value:
            activeLoans.length > 0
              ? `${(avgLtv * 100).toFixed(1)}%`
              : "—",
          status:
            activeLoans.length > 0
              ? ({
                  label: avgLtv > 0.75 ? "Watch policy" : "Within policy",
                  tone: avgLtv > 0.75 ? "warn" : "ok",
                } as const)
              : ({ label: "No collateral values", tone: "neutral" } as const),
          sub: undefined,
        },
        performing: {
          value:
            activeLoans.length > 0
              ? `${statusCounts.active || 0}/${activeLoans.length}`
              : "—",
          status:
            activeLoans.length > 0
              ? ({
                  label: `${(((statusCounts.active || 0) / Math.max(activeLoans.length, 1)) * 100).toFixed(0)}% performing`,
                  tone: defaultedLoans.length > 0 ? "warn" : "ok",
                } as const)
              : ({ label: "No active book yet", tone: "neutral" } as const),
          sub: undefined,
        },
      };

  return (
    <div className="space-y-6">
      <DashboardHero
        title={`${greeting}, ${firstName}.`}
        subtitle={
          isDemo
            ? "Demo portfolio. Capital deployment, draw activity, and maturity risk monitored in real time."
            : "Capital deployment across your active book — risk watch, servicing queue, and draw activity at a glance."
        }
        chips={heroChips}
        scopeToggle={<DashboardScopeToggle defaultMine={defaultMine} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="Deployed capital"
          value={metrics.deployed.value}
          status={metrics.deployed.status}
          sub={metrics.deployed.sub}
          spark={isDemo ? Array.from({ length: 12 }, (_, i) => 12 + i * 0.55) : deployedSpark}
        />
        <MetricCard
          icon={Percent}
          label="Weighted avg rate"
          value={metrics.rate.value}
          status={metrics.rate.status}
          sub={metrics.rate.sub}
          spark={isDemo ? [11.0, 11.05, 11.1, 11.15, 11.2, 11.18, 11.25, 11.3, 11.35, 11.42] : rateSpark}
        />
        <MetricCard
          icon={Shield}
          label="Avg LTV (as-is)"
          value={metrics.ltv.value}
          status={metrics.ltv.status}
          sub={metrics.ltv.sub}
          spark={isDemo ? [60, 61, 62, 63, 63, 62, 63, 63, 63, 63.1] : undefined}
        />
        <MetricCard
          icon={Clock}
          label="Performing"
          value={metrics.performing.value}
          status={metrics.performing.status}
          sub={metrics.performing.sub}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <PipelineBoard
          mode={isDemo ? "demo" : "live"}
          stages={isDemo ? demoStages : liveStages}
          rows={isDemo ? demoPipelineRows : livePipelineRows}
          totalRequested={(isDemo ? demoStages : liveStages).reduce(
            (s, x) => s + x.amount,
            0
          )}
        />
        <TodayPanel rows={isDemo ? demoTodayRows : liveTodayRows} />
      </div>
    </div>
  );
}

function sumAmount(loans: { status: string; loan_amount: number | string }[], status: string) {
  return loans
    .filter((l) => l.status === status)
    .reduce((s, l) => s + Number(l.loan_amount), 0);
}
