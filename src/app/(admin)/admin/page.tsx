import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { DollarSign, Percent, Clock, Shield } from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";
import { DashboardStateToggle } from "@/components/dashboard/dashboard-state-toggle";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { ActionCenter } from "@/components/dashboard/action-center";
import {
  ActivityFeed,
  type ActivitySummaryRow,
} from "@/components/dashboard/activity-feed";
import { MaturityWatchCard } from "@/components/dashboard/maturity-watch-card";
import { LifecycleMonitor } from "@/components/dashboard/lifecycle-monitor";

type ViewMode = "live" | "empty" | "demo";

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

type PriorityRow = {
  id: string;
  title: string;
  count?: number;
  timeLabel?: string;
  description: string;
  cta: string;
  tone: "warn" | "danger" | "neutral";
  href: string;
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
  const nowTs = new Date().getTime();
  const today = new Date(nowTs);
  const sp = await searchParams;
  const viewMode: ViewMode =
    sp.view === "empty" || sp.view === "demo" ? sp.view : "live";

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
      .select("id, amount, payment_type, created_at, due_date, received_date, loan_id")
      .order("created_at", { ascending: false })
      .limit(12),
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
          return sum + (Number(loan.current_principal) / value) * Number(loan.current_principal);
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
      acc[loan.status as LoanStatus] = (acc[loan.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

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

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "team";

  const livePipelineRows: PipelineRow[] = allLoans
    .filter((loan) =>
      ["lead", "application", "underwriting", "approved", "funded"].includes(
        loan.status
      )
    )
    .slice(0, 4)
    .map((loan) => ({
      id: loan.id,
      deal: loan.property?.address_street || "Untitled deal",
      borrower: `Loan ${loan.id.slice(0, 8).toUpperCase()}`,
      property: `${loan.property?.address_city || "—"}, ${loan.property?.address_state || "—"}`,
      stage: LOAN_STATUS_LABELS[loan.status as LoanStatus] || loan.status,
      amount: Number(loan.loan_amount || 0),
      ltv:
        loan.property?.as_is_value && Number(loan.property.as_is_value) > 0
          ? `${Math.round((Number(loan.loan_amount) / Number(loan.property.as_is_value)) * 100)}%`
          : "--",
      updated: formatRelative(loan.updated_at || loan.created_at, nowTs),
    }));

  const liveActivityRows: ActivitySummaryRow[] = [
    {
      id: "docs",
      label: "Documents pending",
      count: (openConditions || []).length,
      detail: "Borrower documents awaiting submission",
      href: "/admin/loans",
    },
    {
      id: "approvals",
      label: "Approvals pending",
      count: (draws || []).length,
      detail: "Draw and underwriting approvals in queue",
      href: "/admin/draws",
    },
    {
      id: "payments",
      label: "Payments due",
      count: (recentPayments || []).filter(
        (payment) =>
          payment.due_date &&
          !payment.received_date &&
          Math.ceil(
            (new Date(payment.due_date + "T00:00:00Z").getTime() - nowTs) /
              (1000 * 60 * 60 * 24)
          ) <= 7
      ).length,
      detail: "Payments due inside the next 7 days",
      href: "/admin/servicing",
    },
    {
      id: "updates",
      label: "Borrower updates",
      count: (signatures || []).length,
      detail: "Recent borrower and signature interactions",
      href: "/admin/notifications",
    },
    {
      id: "servicing",
      label: "Servicing events",
      count: defaultedLoans.length,
      detail: "Delinquency and exception events",
      href: "/admin/servicing",
    },
  ];

  const livePriorityRows: PriorityRow[] = [
    {
      id: "docs",
      title: "Missing document conditions",
      count: (openConditions || []).length,
      timeLabel: "Due this week",
      description: "Borrower documents and conditions requiring closure.",
      cta: "Review",
      tone: (openConditions || []).length > 0 ? "warn" : "neutral",
      href: "/admin/loans",
    },
    {
      id: "draws",
      title: "Draw approvals pending",
      count: (draws || []).length,
      timeLabel: "Awaiting inspection",
      description: "Requests pending inspection confirmation and sign-off.",
      cta: "Approve",
      tone: (draws || []).length > 0 ? "danger" : "neutral",
      href: "/admin/draws",
    },
    {
      id: "review",
      title: "Underwriting reviews pending",
      count: underReview,
      timeLabel: "Files queued",
      description: "Files waiting for underwriting decisions.",
      cta: "View",
      tone: underReview > 0 ? "warn" : "neutral",
      href: "/admin/loans?status=underwriting",
    },
    {
      id: "maturity",
      title: "Maturities inside 30 days",
      count: maturingThirty.length,
      timeLabel: "Outreach needed",
      description: "Start payoff or extension conversations immediately.",
      cta: "Contact",
      tone: maturingThirty.length > 0 ? "danger" : "neutral",
      href: "/admin/servicing",
    },
    {
      id: "payments",
      title: "Payments due",
      count: liveActivityRows.find((row) => row.id === "payments")?.count || 0,
      timeLabel: "Next 7 days",
      description: "Monitor inbound payment commitments and collection risk.",
      cta: "View",
      tone:
        (liveActivityRows.find((row) => row.id === "payments")?.count || 0) > 0
          ? "warn"
          : "neutral",
      href: "/admin/servicing",
    },
  ];

  const demoLifecycleCounts: Record<LoanStatus, number> = {
    lead: 9,
    application: 6,
    underwriting: 4,
    approved: 3,
    funded: 31,
    active: 29,
    paid_off: 18,
    defaulted: 1,
    foreclosure: 1,
  };

  const demoView = {
    title: `${greeting}, ${firstName}`,
    subtitle:
      "Your lending book is stable. Capital deployment, draw activity, and maturity risk are being monitored in real time.",
    chips: [
      { label: "Portfolio stable", tone: "ok" as const },
      { label: "2 maturities in 30 days", tone: "warn" as const },
      { label: "7 deals in flow", tone: "warn" as const },
      { label: "3 draws awaiting review", tone: "danger" as const },
    ],
    metrics: {
      deployed: {
        icon: DollarSign,
        value: "$18.7M",
        status: { label: "74.8% deployed", tone: "warn" as const },
        sub: "of $25.0M committed",
      },
      rate: {
        icon: Percent,
        value: "11.42%",
        status: { label: "+18 bps vs prior 30d", tone: "ok" as const },
        sub: "Across active portfolio",
      },
      ltv: {
        icon: Shield,
        value: "63.1%",
        status: { label: "Within policy", tone: "ok" as const },
        sub: "Across 31 collateralized loans",
      },
      performing: {
        icon: Clock,
        value: "29/31",
        status: { label: "93.5% performing", tone: "ok" as const },
        sub: "2 loans require attention",
      },
    },
    stages: [
      { id: "lead", label: "Lead", count: 9, amount: 2900000 },
      { id: "application", label: "Application", count: 6, amount: 2150000 },
      { id: "underwriting", label: "Underwriting", count: 4, amount: 1865000, attention: true },
      { id: "approved", label: "Approved", count: 3, amount: 1540000, attention: true },
      { id: "funded", label: "Funded", count: 31, amount: 18700000 },
      { id: "closed", label: "Closed", count: 18, amount: 10400000 },
    ] as PipelineStage[],
    pipelineRows: [
      {
        id: "deal-1",
        deal: "Maple Street Bridge Loan",
        borrower: "Hartwell Homes LLC",
        property: "184 Maple St, Montclair NJ",
        stage: "Underwriting",
        amount: 725000,
        ltv: "64%",
        updated: "2h ago",
      },
      {
        id: "deal-2",
        deal: "Shoreline Rehab Draw",
        borrower: "Beacon Ridge Capital",
        property: "22 Ocean Ave, Long Branch NJ",
        stage: "Draw review",
        amount: 1200000,
        ltv: "58%",
        updated: "5h ago",
      },
      {
        id: "deal-3",
        deal: "Newark Two-Family Refi",
        borrower: "Ironbound Property Group",
        property: "91 Ferry St, Newark NJ",
        stage: "Approved",
        amount: 540000,
        ltv: "67%",
        updated: "Yesterday",
      },
      {
        id: "deal-4",
        deal: "Camden Fix & Flip",
        borrower: "Riverside Holdings",
        property: "14 Cooper Ave, Camden NJ",
        stage: "Application",
        amount: 390000,
        ltv: "61%",
        updated: "2d ago",
      },
    ] as PipelineRow[],
    activityRows: [
      {
        id: "docs",
        label: "Documents pending",
        count: 12,
        detail: "Borrower documents awaiting submission",
        href: "/admin/loans",
      },
      {
        id: "approvals",
        label: "Approvals pending",
        count: 3,
        detail: "Draw and underwriting approvals awaiting review",
        href: "/admin/draws",
      },
      {
        id: "payments",
        label: "Payments due",
        count: 2,
        detail: "Payments due inside the next 7 days",
        href: "/admin/servicing",
      },
      {
        id: "updates",
        label: "Borrower updates",
        count: 5,
        detail: "Recent borrower communications and updates",
        href: "/admin/notifications",
      },
      {
        id: "servicing",
        label: "Servicing events",
        count: 1,
        detail: "Servicing exception requires operator follow-up",
        href: "/admin/servicing",
      },
    ] as ActivitySummaryRow[],
    maturity: {
      active: true,
      inside30Count: 2,
      inside30Exposure: 1100000,
      inside90Count: 6,
      inside90Exposure: 4800000,
    },
    lifecycleCounts: demoLifecycleCounts,
    priorityRows: [
      {
        id: "docs",
        title: "Missing document conditions",
        count: 12,
        timeLabel: "Due this week",
        description: "Borrower documents pending submission",
        cta: "Review",
        tone: "warn" as const,
        href: "/admin/loans",
      },
      {
        id: "draws",
        title: "Draw approvals pending",
        count: 3,
        timeLabel: "Awaiting inspection",
        description: "Draw requests requiring review",
        cta: "Approve",
        tone: "danger" as const,
        href: "/admin/draws",
      },
      {
        id: "review",
        title: "Underwriting reviews pending",
        count: 4,
        timeLabel: "Files queued",
        description: "Underwriting decisions required",
        cta: "View",
        tone: "warn" as const,
        href: "/admin/loans?status=underwriting",
      },
      {
        id: "maturity",
        title: "Maturities inside 30 days",
        count: 2,
        timeLabel: "Outreach needed",
        description: "Extension and payoff conversations this week",
        cta: "Contact",
        tone: "danger" as const,
        href: "/admin/servicing",
      },
      {
        id: "payments",
        title: "Payments due",
        count: 2,
        timeLabel: "Next 7 days",
        description: "Payment follow-up and collection readiness",
        cta: "View",
        tone: "warn" as const,
        href: "/admin/servicing",
      },
    ] as PriorityRow[],
  };

  const emptyView = {
    title: `${greeting}, ${firstName}`,
    subtitle:
      "Set up your lending book, add your first loan, and start tracking capital, risk, draws, and maturities from one command center.",
    chips: [
      { label: "Setup needed", tone: "warn" as const },
      { label: "No loans yet", tone: "neutral" as const },
      { label: "Risk watch inactive", tone: "neutral" as const },
    ],
    metrics: {
      deployed: {
        icon: DollarSign,
        value: "$0.00",
        status: { label: "No active loans yet", tone: "neutral" as const },
        sub: "Add your first loan to begin tracking deployment.",
      },
      rate: {
        icon: Percent,
        value: "--",
        status: { label: "No rate data yet", tone: "neutral" as const },
        sub: "Rates appear once loans are funded.",
      },
      ltv: {
        icon: Shield,
        value: "--",
        status: { label: "No collateral values yet", tone: "neutral" as const },
        sub: "Add property values to monitor leverage.",
      },
      performing: {
        icon: Clock,
        value: "--",
        status: { label: "No active loan book yet", tone: "neutral" as const },
        sub: "Performance tracking begins after funding.",
      },
    },
    stages: [
      { id: "lead", label: "Lead", count: 0, amount: 0 },
      { id: "application", label: "Application", count: 0, amount: 0 },
      { id: "underwriting", label: "Underwriting", count: 0, amount: 0 },
      { id: "approved", label: "Approved", count: 0, amount: 0 },
      { id: "funded", label: "Funded", count: 0, amount: 0 },
      { id: "closed", label: "Closed", count: 0, amount: 0 },
    ] as PipelineStage[],
    pipelineRows: [] as PipelineRow[],
    activityRows: [
      {
        id: "updates",
        label: "No borrower activity yet",
        count: 0,
        detail: "No borrower interactions recorded",
        href: "/admin/notifications",
      },
      {
        id: "docs",
        label: "No documents pending",
        count: 0,
        detail: "No borrower document requests are outstanding",
        href: "/admin/loans",
      },
      {
        id: "approvals",
        label: "No approvals pending",
        count: 0,
        detail: "No underwriting or draw approvals in queue",
        href: "/admin/pipeline",
      },
      {
        id: "payments",
        label: "No payments due",
        count: 0,
        detail: "No servicing payment schedule is active",
        href: "/admin/servicing",
      },
      {
        id: "servicing",
        label: "No servicing events",
        count: 0,
        detail: "Servicing queue becomes active after funding",
        href: "/admin/servicing",
      },
    ] as ActivitySummaryRow[],
    maturity: {
      active: false,
      inside30Count: 0,
      inside30Exposure: 0,
      inside90Count: 0,
      inside90Exposure: 0,
    },
    lifecycleCounts: {
      lead: 0,
      application: 0,
      underwriting: 0,
      approved: 0,
      funded: 0,
      active: 0,
      paid_off: 0,
      defaulted: 0,
      foreclosure: 0,
    } as Record<LoanStatus, number>,
    priorityRows: [
      {
        id: "setup-loan",
        title: "Add your first loan",
        timeLabel: "Setup needed",
        description: "Create a loan record to activate portfolio tracking.",
        cta: "Add loan",
        tone: "warn" as const,
        href: "/admin/loans/new",
      },
      {
        id: "setup-borrower",
        title: "Import borrower contacts",
        timeLabel: "Onboarding",
        description: "Upload borrowers to build your operating book.",
        cta: "Import",
        tone: "neutral" as const,
        href: "/admin/borrowers",
      },
      {
        id: "setup-property",
        title: "Add property collateral",
        timeLabel: "Data setup",
        description: "Enter collateral values to unlock LTV monitoring.",
        cta: "Add property",
        tone: "neutral" as const,
        href: "/admin/properties",
      },
      {
        id: "setup-team",
        title: "Invite your team",
        timeLabel: "Access",
        description: "Assign underwriting and servicing responsibilities.",
        cta: "Invite",
        tone: "neutral" as const,
        href: "/admin/settings",
      },
      {
        id: "setup-reminders",
        title: "Configure servicing reminders",
        timeLabel: "Automation",
        description: "Set payment, maturity, and draw reminder policies.",
        cta: "Configure",
        tone: "neutral" as const,
        href: "/admin/settings",
      },
    ] as PriorityRow[],
  };

  const liveView = {
    title: `${greeting}, ${firstName}`,
    subtitle:
      "Capital deployment across your active lending book, including risk watch, servicing queue, and draw activity.",
    chips: [
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
    ],
    metrics: {
      deployed: {
        icon: DollarSign,
        value: formatCurrency(totalDeployed),
        status:
          totalDeployed > 0
            ? ({ label: `${activeLoans.length} active loans`, tone: "ok" } as const)
            : ({ label: "No active loans yet", tone: "neutral" } as const),
        sub:
          totalDeployed > 0
            ? "Capital deployment across active loan book"
            : "Add your first loan to begin tracking deployment.",
      },
      rate: {
        icon: Percent,
        value: activeLoans.length > 0 ? `${(weightedRate * 100).toFixed(2)}%` : "--",
        status:
          activeLoans.length > 0
            ? ({ label: "Across active portfolio", tone: "ok" } as const)
            : ({ label: "No rate data yet", tone: "neutral" } as const),
        sub:
          activeLoans.length > 0
            ? "Weighted average contract rate"
            : "Rates appear once loans are funded.",
      },
      ltv: {
        icon: Shield,
        value: activeLoans.length > 0 ? `${(avgLtv * 100).toFixed(1)}%` : "--",
        status:
          activeLoans.length > 0
            ? ({
                label: avgLtv > 0.75 ? "Watch policy" : "Within policy",
                tone: avgLtv > 0.75 ? "warn" : "ok",
              } as const)
            : ({ label: "No collateral values yet", tone: "neutral" } as const),
        sub:
          activeLoans.length > 0
            ? `Across ${activeLoans.length} collateralized loans`
            : "Add property values to monitor leverage.",
      },
      performing: {
        icon: Clock,
        value: activeLoans.length > 0 ? `${statusCounts.active || 0}/${activeLoans.length}` : "--",
        status:
          activeLoans.length > 0
            ? ({
                label: `${(((statusCounts.active || 0) / Math.max(activeLoans.length, 1)) * 100).toFixed(1)}% performing`,
                tone: defaultedLoans.length > 0 ? "warn" : "ok",
              } as const)
            : ({ label: "No active loan book yet", tone: "neutral" } as const),
        sub:
          activeLoans.length > 0
            ? `${defaultedLoans.length} loan${defaultedLoans.length === 1 ? "" : "s"} require attention`
            : "Performance tracking begins after funding.",
      },
    },
    stages: [
      {
        id: "lead",
        label: "Lead",
        count: statusCounts.lead || 0,
        amount: allLoans
          .filter((loan) => loan.status === "lead")
          .reduce((sum, loan) => sum + Number(loan.loan_amount), 0),
      },
      {
        id: "application",
        label: "Application",
        count: statusCounts.application || 0,
        amount: allLoans
          .filter((loan) => loan.status === "application")
          .reduce((sum, loan) => sum + Number(loan.loan_amount), 0),
      },
      {
        id: "underwriting",
        label: "Underwriting",
        count: statusCounts.underwriting || 0,
        amount: allLoans
          .filter((loan) => loan.status === "underwriting")
          .reduce((sum, loan) => sum + Number(loan.loan_amount), 0),
        attention: (statusCounts.underwriting || 0) > 0,
      },
      {
        id: "approved",
        label: "Approved",
        count: statusCounts.approved || 0,
        amount: allLoans
          .filter((loan) => loan.status === "approved")
          .reduce((sum, loan) => sum + Number(loan.loan_amount), 0),
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
        amount: allLoans
          .filter((loan) => loan.status === "paid_off")
          .reduce((sum, loan) => sum + Number(loan.loan_amount), 0),
      },
    ] as PipelineStage[],
    pipelineRows: livePipelineRows,
    activityRows: liveActivityRows,
    maturity: {
      active: maturingSoon.length > 0,
      inside30Count: maturingThirty.length,
      inside30Exposure: maturingThirty.reduce(
        (sum, loan) => sum + Number(loan.current_principal),
        0
      ),
      inside90Count: maturingSoon.length,
      inside90Exposure: maturingSoon.reduce(
        (sum, loan) => sum + Number(loan.current_principal),
        0
      ),
    },
    lifecycleCounts: {
      lead: statusCounts.lead || 0,
      application: statusCounts.application || 0,
      underwriting: statusCounts.underwriting || 0,
      approved: statusCounts.approved || 0,
      funded: statusCounts.funded || 0,
      active: statusCounts.active || 0,
      paid_off: statusCounts.paid_off || 0,
      defaulted: statusCounts.defaulted || 0,
      foreclosure: statusCounts.foreclosure || 0,
    } as Record<LoanStatus, number>,
    priorityRows: livePriorityRows,
  };

  const effectiveMode: ViewMode =
    viewMode === "live" && allLoans.length === 0 ? "empty" : viewMode;
  const model =
    effectiveMode === "demo"
      ? demoView
      : effectiveMode === "empty"
        ? emptyView
        : liveView;

  const scopeControls = (
    <div className="flex items-center gap-2">
      <DashboardScopeToggle defaultMine={defaultMine} />
      <DashboardStateToggle />
    </div>
  );

  return (
    <div className="space-y-6">
      <DashboardHero
        title={model.title}
        subtitle={model.subtitle}
        chips={model.chips}
        scopeToggle={scopeControls}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={model.metrics.deployed.icon}
          label="Deployed capital"
          value={model.metrics.deployed.value}
          status={model.metrics.deployed.status}
          sub={model.metrics.deployed.sub}
          spark={effectiveMode === "empty" ? [] : deployedSpark}
          emptyRail={model.metrics.deployed.value === "$0.00"}
        />
        <MetricCard
          icon={model.metrics.rate.icon}
          label="Weighted avg rate"
          value={model.metrics.rate.value}
          status={model.metrics.rate.status}
          sub={model.metrics.rate.sub}
          spark={effectiveMode === "empty" ? [] : rateSpark}
          emptyRail={model.metrics.rate.value === "--"}
        />
        <MetricCard
          icon={model.metrics.ltv.icon}
          label="Avg LTV (as-is)"
          value={model.metrics.ltv.value}
          status={model.metrics.ltv.status}
          sub={model.metrics.ltv.sub}
          emptyRail={model.metrics.ltv.value === "--"}
        />
        <MetricCard
          icon={model.metrics.performing.icon}
          label="Performing"
          value={model.metrics.performing.value}
          status={model.metrics.performing.status}
          sub={model.metrics.performing.sub}
          emptyRail={model.metrics.performing.value === "--"}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.75fr_1fr]">
        <PipelineBoard
          mode={effectiveMode}
          stages={model.stages}
          rows={model.pipelineRows}
          totalRequested={model.stages.reduce((sum, stage) => sum + stage.amount, 0)}
        />
        <ActivityFeed mode={effectiveMode} rows={model.activityRows} />
      </div>

      <MaturityWatchCard
        active={model.maturity.active}
        inside30Count={model.maturity.inside30Count}
        inside30Exposure={model.maturity.inside30Exposure}
        inside90Count={model.maturity.inside90Count}
        inside90Exposure={model.maturity.inside90Exposure}
      />

      <LifecycleMonitor counts={model.lifecycleCounts} />

      <div className="grid gap-4">
        <ActionCenter rows={model.priorityRows} />
      </div>
    </div>
  );
}
