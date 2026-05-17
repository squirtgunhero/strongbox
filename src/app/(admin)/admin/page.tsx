import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { type LoanStatus, LOAN_STATUS_LABELS } from "@/lib/types";
import { Plus, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";
import { DashboardStrip } from "@/components/dashboard/dashboard-strip";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { TodayPanel, type TodayRow } from "@/components/dashboard/today-panel";
import { MaturityLadder } from "@/components/dashboard/maturity-ladder";
import { RecentlyFunded } from "@/components/dashboard/recently-funded";
import { DashboardOnboarding } from "@/components/dashboard/dashboard-onboarding";
import { ConcentrationBanner } from "@/components/dashboard/concentration-banner";
import { analyzeConcentration } from "@/lib/calculations/concentration";
import { borrowerDisplayName } from "@/lib/format";

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

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toFixed(0)}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const nowTs = Date.now();
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
  const isMine =
    sp.scope === "mine" || (sp.scope === undefined && defaultMine);

  let loanQuery = supabase.from("loans").select(`
    *,
    property:properties(address_street, address_city, address_state, as_is_value),
    loan_borrowers(is_primary, borrower:borrowers(id, borrower_type, first_name, last_name, entity_name))
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
    supabase.from("payments").select("id, due_date, received_date").limit(50),
    supabase
      .from("loan_conditions")
      .select("loan_id", { count: "exact", head: false })
      .eq("is_satisfied", false),
  ]);

  const allLoans = loans || [];

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";

  // ZERO data → onboarding only.
  if (allLoans.length === 0) {
    return <DashboardOnboarding firstName={firstName} />;
  }

  const activeLoans = allLoans.filter((l) =>
    ["funded", "active"].includes(l.status)
  );
  const totalDeployed = activeLoans.reduce(
    (s, l) => s + Number(l.current_principal),
    0
  );

  // Load concentration thresholds + compute breach report. Quietly degrade
  // to a "no breaches" report if settings are unreachable so the dashboard
  // never crashes on this.
  const { data: orgSettings } = await supabase
    .from("org_settings")
    .select("max_borrower_concentration, max_state_concentration")
    .eq("id", 1)
    .single();
  const concentration = analyzeConcentration(
    activeLoans.map((l) => {
      const lb = (
        l as unknown as {
          loan_borrowers?: {
            is_primary: boolean;
            borrower: {
              id: string;
              borrower_type: string;
              first_name: string | null;
              last_name: string | null;
              entity_name: string | null;
            } | null;
          }[];
        }
      ).loan_borrowers;
      const primary = lb?.find((x) => x.is_primary) ?? lb?.[0];
      const borrower = primary?.borrower;
      return {
        current_principal: Number(l.current_principal) || 0,
        borrower_id: borrower?.id ?? "unknown",
        borrower_label: borrower
          ? borrowerDisplayName(borrower)
          : "Unknown borrower",
        state:
          (l as unknown as { property: { address_state: string } | null })
            .property?.address_state ?? "??",
      };
    }),
    {
      maxBorrower: Number(orgSettings?.max_borrower_concentration) || 0.2,
      maxState: Number(orgSettings?.max_state_concentration) || 0.4,
    }
  );
  const defaultedLoans = allLoans.filter((l) => l.status === "defaulted");
  const pipelineLoans = allLoans.filter((l) =>
    ["lead", "application", "underwriting", "approved"].includes(l.status)
  );
  const underReview = allLoans.filter((l) => l.status === "underwriting").length;
  const weightedRate =
    totalDeployed > 0
      ? activeLoans.reduce(
          (s, l) => s + Number(l.current_principal) * Number(l.interest_rate),
          0
        ) / totalDeployed
      : 0;
  const avgLtv =
    totalDeployed > 0
      ? activeLoans.reduce((s, l) => {
          const v = Number(l.property?.as_is_value) || 0;
          if (!v) return s;
          return (
            s +
            (Number(l.current_principal) / v) * Number(l.current_principal)
          );
        }, 0) / totalDeployed
      : 0;

  const maturingSoon = activeLoans.filter((l) => {
    if (!l.maturity_date) return false;
    const d = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - nowTs) /
        86_400_000
    );
    return d <= 90;
  });
  const maturingThirty = maturingSoon.filter((l) => {
    const d = Math.ceil(
      (new Date(l.maturity_date! + "T00:00:00Z").getTime() - nowTs) /
        86_400_000
    );
    return d <= 30;
  });

  const statusCounts = allLoans.reduce(
    (acc, l) => {
      acc[l.status as LoanStatus] = (acc[l.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  const paymentsDueSoon = (recentPayments || []).filter(
    (p) =>
      p.due_date &&
      !p.received_date &&
      Math.ceil(
        (new Date(p.due_date + "T00:00:00Z").getTime() - nowTs) / 86_400_000
      ) <= 7
  ).length;

  // ---------- MODELS ----------
  const eyebrow =
    `${formatDate(today.toISOString().slice(0, 10))} · ${
      profile?.full_name || "Operator"
    }`;

  const stripStats = [
    { value: pipelineLoans.length, label: "in flight" },
    defaultedLoans.length > 0
      ? {
          value: defaultedLoans.length,
          label: "in default",
          tone: "danger" as const,
        }
      : { value: activeLoans.length, label: "active" },
    {
      value: maturingThirty.length,
      label: "maturing 30d",
      tone: maturingThirty.length > 0 ? ("warn" as const) : undefined,
    },
  ];

  const kpis = [
    {
      label: "Deployed",
      value: totalDeployed > 0 ? fmtCompact(totalDeployed) : "—",
      sub: `${activeLoans.length} active`,
    },
    {
      label: "Weighted rate",
      value: weightedRate > 0 ? `${(weightedRate * 100).toFixed(2)}%` : "—",
      sub: activeLoans.length > 0 ? "contract" : "no data yet",
    },
    {
      label: "Avg LTV (as-is)",
      value: avgLtv > 0 ? `${(avgLtv * 100).toFixed(1)}%` : "—",
      sub: "policy 75%",
      tone:
        avgLtv > 0.75
          ? ("warn" as const)
          : ("neutral" as const),
    },
    {
      label: "Performing",
      value:
        activeLoans.length > 0
          ? `${statusCounts.active || 0}/${activeLoans.length}`
          : "—",
      sub:
        activeLoans.length > 0
          ? `${(((statusCounts.active || 0) / Math.max(activeLoans.length, 1)) * 100).toFixed(0)}% current`
          : "no active book",
    },
  ];

  const liveStages = [
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

  const livePipelineRows = allLoans
    .filter((l) =>
      ["lead", "application", "underwriting", "approved", "funded"].includes(
        l.status
      )
    )
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      deal: l.property?.address_street || "Untitled deal",
      borrower: `Loan ${l.id.slice(0, 8).toUpperCase()}`,
      property: `${l.property?.address_city || "—"}, ${l.property?.address_state || "—"}`,
      stage: LOAN_STATUS_LABELS[l.status as LoanStatus] || l.status,
      amount: Number(l.loan_amount || 0),
      ltv:
        l.property?.as_is_value && Number(l.property.as_is_value) > 0
          ? `${Math.round((Number(l.loan_amount) / Number(l.property.as_is_value)) * 100)}%`
          : "—",
      updated: formatRelative(l.updated_at || l.created_at, nowTs),
    }));

  const liveTodayRows: TodayRow[] = [
    {
      id: "draws",
      label: "Draw approvals pending",
      count: (draws || []).length,
      detail: "Awaiting inspection",
      href: "/admin/draws",
      iconKind: "draws",
      tone: (draws || []).length > 0 ? "high" : "low",
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
      id: "docs",
      label: "Documents pending",
      count: (openConditions || []).length,
      detail: "Borrower submissions outstanding",
      href: "/admin/loans",
      iconKind: "docs",
      tone: (openConditions || []).length > 0 ? "med" : "low",
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
      detail: "Signatures and comms",
      href: "/admin/notifications",
      iconKind: "updates",
      tone: "low",
    },
  ];

  const liveMaturityRows = maturingSoon.slice(0, 5).map((l) => {
    const d = Math.ceil(
      (new Date(l.maturity_date! + "T00:00:00Z").getTime() - nowTs) /
        86_400_000
    );
    return {
      id: l.id,
      address: l.property?.address_street || "Untitled",
      maturity: formatDate(l.maturity_date),
      balance: Number(l.current_principal),
      daysOut: d,
    };
  });

  const liveFundedRows = activeLoans.slice(0, 5).map((l) => ({
    id: l.id,
    address: l.property?.address_street || "Untitled",
    borrower: `Loan ${l.id.slice(0, 8).toUpperCase()}`,
    balance: Number(l.current_principal),
    rate: Number(l.interest_rate),
    fundedDate: l.funded_date,
    performance: l.is_defaulted ? ("default" as const) : ("current" as const),
  }));

  return (
    <div className="flex flex-col gap-5">
      <DashboardStrip
        eyebrow={eyebrow}
        stats={stripStats}
        scopeToggle={<DashboardScopeToggle defaultMine={defaultMine} />}
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-3"
              render={<Link href="/api/reports/loans.csv" target="_blank" />}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              nativeButton={false}
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-3 font-medium"
              render={<Link href="/admin/loans/new" />}
            >
              <Plus className="h-3.5 w-3.5" />
              New loan
            </Button>
          </>
        }
      />

      <ConcentrationBanner report={concentration} />

      <KpiStrip cells={kpis} />

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <PipelineBoard
          mode="live"
          stages={liveStages}
          rows={livePipelineRows}
          totalRequested={liveStages.reduce((s, x) => s + x.amount, 0)}
        />
        <TodayPanel rows={liveTodayRows} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <RecentlyFunded rows={liveFundedRows} />
        <MaturityLadder
          rows={liveMaturityRows}
          totalExposure={liveMaturityRows.reduce(
            (s, r) => s + r.balance,
            0
          )}
        />
      </div>
    </div>
  );
}

function sumAmount(
  loans: { status: string; loan_amount: number | string }[],
  status: string
) {
  return loans
    .filter((l) => l.status === status)
    .reduce((s, l) => s + Number(l.loan_amount), 0);
}
