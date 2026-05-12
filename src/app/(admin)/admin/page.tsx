import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import {
  DollarSign,
  Percent,
  Workflow,
  Clock,
  ArrowRight,
  Plus,
  Activity,
  CalendarClock,
  ListChecks,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";
import { StatCard } from "@/components/stat-card";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, loanStatusTone } from "@/components/status-badge";
import { PipelineStageCard } from "@/components/pipeline-stage-card";

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

function activityDotColor(kind: string): string {
  switch (kind) {
    case "payment":
    case "stage":
      return "bg-[color:var(--status-success)]";
    case "draw":
      return "bg-[color:var(--status-info)]";
    case "doc":
      return "bg-[color:var(--status-warning)]";
    case "alert":
      return "bg-primary";
    default:
      return "bg-muted-foreground";
  }
}

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
    property:properties(address_street, address_city, address_state)
  `);
  if (isMine && user) loanQuery = loanQuery.eq("loan_officer_id", user.id);

  const [
    { data: loans },
    { data: draws },
    { data: signatures },
    { data: recentPayments },
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
        loan:loans(id, property:properties(address_street, address_city))
      `)
      .in("status", ["draft", "sent", "viewed"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select(
        "id, amount, payment_type, received_date, created_at, loan_id"
      )
      .order("created_at", { ascending: false })
      .limit(6),
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
  const weightedRate =
    totalDeployed > 0
      ? activeLoans.reduce(
          (s, l) => s + Number(l.current_principal) * Number(l.interest_rate),
          0
        ) / totalDeployed
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

  // Sparkline placeholders — real series will come from monthly snapshots
  const deployedSpark = totalDeployed > 0
    ? Array.from({ length: 12 }).map(
        (_, i) => totalDeployed * (0.55 + (i / 12) * 0.45)
      )
    : [];
  const rateSpark = [0.115, 0.114, 0.113, 0.114, 0.113, 0.112, 0.111, 0.112, 0.111, weightedRate || 0.11];

  const statusCounts = allLoans.reduce(
    (acc, l) => {
      acc[l.status as LoanStatus] = (acc[l.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  // Insurance attention = active loans missing/expired/expiring insurance
  const insuranceAttention = activeLoans.filter((l) => {
    if (!l.insurance_carrier) return true;
    if (!l.insurance_expiration_date) return false;
    const days = Math.ceil(
      (new Date(l.insurance_expiration_date + "T00:00:00Z").getTime() - now) /
        (1000 * 60 * 60 * 24)
    );
    return days < 30;
  });

  // Activity feed: merge draws, signatures, payments by timestamp
  type ActivityEntry = {
    kind: "stage" | "draw" | "doc" | "payment" | "alert";
    who: string;
    text: string;
    at: string;
    timestamp: string;
    href?: string;
  };
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
      timestamp: draw.requested_at,
      href: `/admin/loans/${draw.loan?.id}`,
    });
  }
  for (const p of recentPayments || []) {
    activity.push({
      kind: "payment",
      who: p.loan_id?.slice(0, 8).toUpperCase() || "—",
      text: `${p.payment_type.replace(/_/g, " ")} payment of ${formatCurrency(Number(p.amount))}`,
      at: formatRelative(p.created_at),
      timestamp: p.created_at,
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
      timestamp: sig.created_at,
      href: `/admin/loans/${sig.loan?.id}`,
    });
  }
  activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const activityTop = activity.slice(0, 6);

  // This week — actions for you
  type Action = {
    href: string;
    who: string;
    text: string;
    label: string;
    tone: "default" | "destructive" | "outline";
  };
  const actions: Action[] = [];
  for (const l of allLoans.filter((l) => l.status === "approved").slice(0, 2)) {
    actions.push({
      href: `/admin/loans/${l.id}`,
      who: l.id.slice(0, 8).toUpperCase(),
      text: "Approved — ready to fund",
      label: "Fund",
      tone: "default",
    });
  }
  for (const l of defaultedLoans.slice(0, 2)) {
    actions.push({
      href: `/admin/loans/${l.id}`,
      who: l.id.slice(0, 8).toUpperCase(),
      text: "In default — contact borrower",
      label: "Contact",
      tone: "destructive",
    });
  }
  for (const d of (draws || []).slice(0, 2)) {
    const draw = d as unknown as { loan: { id: string }; status: string };
    actions.push({
      href: `/admin/loans/${draw.loan?.id}`,
      who: draw.loan?.id?.slice(0, 8).toUpperCase() || "—",
      text: `Draw ${draw.status} — needs ${draw.status === "requested" ? "inspection" : "approval"}`,
      label: "Review",
      tone: "outline",
    });
  }

  return (
    <div className="space-y-5">
      {/* Dashboard header */}
      <div className="relative pl-4">
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[26px] font-semibold tracking-[-0.025em] leading-tight">
                Dashboard
              </h1>
              <Badge
                variant="outline"
                className="text-[10.5px] tracking-wider uppercase font-medium border-primary/30 text-primary bg-primary/[0.04] py-0 px-1.5"
              >
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground text-[13.5px]">
              Monitor pipeline, servicing, draws, maturities, and investor activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardScopeToggle defaultMine={defaultMine} />
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href="/admin/pipeline" />}
            >
              View pipeline
            </Button>
            <Button
              nativeButton={false}
              size="sm"
              render={<Link href="/admin/loans/new" />}
            >
              <Plus className="h-3.5 w-3.5" />
              New loan
            </Button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Deployed capital"
          value={formatCurrency(totalDeployed)}
          sub={
            totalDeployed > 0
              ? `across ${activeLoans.length} active`
              : "No active loans yet"
          }
          delta={
            totalDeployed > 0 ? { dir: "up", text: "+$412k MoM" } : undefined
          }
          spark={deployedSpark}
          empty={totalDeployed === 0}
          emptyLabel="$0"
        />
        <StatCard
          icon={Percent}
          label="Weighted avg rate"
          value={`${(weightedRate * 100).toFixed(2)}%`}
          sub={weightedRate > 0 ? "contract" : "No active loans"}
          delta={weightedRate > 0 ? { dir: "down", text: "-12 bps" } : undefined}
          spark={weightedRate > 0 ? rateSpark : []}
          sparkStroke="var(--muted-foreground)"
          empty={weightedRate === 0}
          emptyLabel="0.00%"
        />
        <StatCard
          icon={Workflow}
          label="Pipeline"
          value={`${pipelineLoans.length}`}
          sub={
            pipelineLoans.length > 0
              ? "leads → approved"
              : "Awaiting pipeline activity"
          }
          empty={pipelineLoans.length === 0}
          emptyLabel="0"
        />
        <StatCard
          icon={Clock}
          label="Maturing ≤30d"
          value={`${maturingSoon.filter((l) => {
            const d = l.maturity_date
              ? Math.ceil(
                  (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
                    (1000 * 60 * 60 * 24)
                )
              : Infinity;
            return d <= 30;
          }).length}`}
          sub={
            defaultedLoans.length > 0
              ? `${defaultedLoans.length} in default`
              : maturingSoon.length === 0
                ? "No upcoming maturities"
                : "Action this month"
          }
          attention={
            defaultedLoans.length > 0 ||
            maturingSoon.filter((l) => {
              const d = l.maturity_date
                ? Math.ceil(
                    (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
                      (1000 * 60 * 60 * 24)
                  )
                : Infinity;
              return d <= 30;
            }).length > 0
          }
          empty={maturingSoon.length === 0 && defaultedLoans.length === 0}
          emptyLabel="0"
        />
      </div>

      {/* 1.6fr / 1fr grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.6fr_1fr] min-w-0">
        {/* Pipeline summary */}
        <DashboardCard
          title="Pipeline"
          subtitle={
            pipelineLoans.length > 0
              ? `${pipelineLoans.length} deals in flight · ${formatCurrency(pipelineLoans.reduce((s, l) => s + Number(l.loan_amount), 0))} requested`
              : "No deals in flight"
          }
          action={
            <Link
              href="/admin/pipeline"
              className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Open pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {pipelineLoans.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title="No pipeline activity yet"
              description="New leads and applications will appear here as they progress through underwriting."
              action={{ label: "Start a new loan", href: "/admin/loans/new", variant: "outline" }}
              size="compact"
            />
          ) : (
            <div className="grid grid-cols-5 gap-2.5">
              {(
                [
                  "lead",
                  "application",
                  "underwriting",
                  "approved",
                  "funded",
                ] as const
              ).map((stage) => {
                const inStage = allLoans.filter((l) => l.status === stage);
                const amt = inStage.reduce(
                  (s, l) => s + Number(l.loan_amount),
                  0
                );
                return (
                  <Link key={stage} href={`/admin/loans?status=${stage}`}>
                    <PipelineStageCard
                      label={LOAN_STATUS_LABELS[stage]}
                      count={inStage.length}
                      amount={amt ? `$${(amt / 1_000_000).toFixed(2)}M` : undefined}
                      attention={stage === "approved" && inStage.length > 0}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </DashboardCard>

        {/* Activity */}
        <DashboardCard
          title="Activity"
          subtitle="Recent updates across your portfolio"
          noContentPadding
        >
          {activityTop.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity yet"
              description="Loan updates, draw requests, document changes, and approvals will appear here."
              action={{ label: "View audit log", href: "/admin/audit", variant: "ghost" }}
              size="compact"
            />
          ) : (
            <ul>
              {activityTop.map((a, idx) => (
                <li key={idx}>
                  <Link
                    href={a.href || "#"}
                    className="grid grid-cols-[16px_1fr_auto] gap-3 items-start px-5 py-2.5 border-t first:border-t-0 hover:bg-muted/40"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full mt-2 ${activityDotColor(a.kind)}`}
                    />
                    <div className="text-[12.5px] min-w-0 truncate">
                      <span className="font-medium mono text-[11.5px] text-muted-foreground">
                        {a.who}
                      </span>{" "}
                      <span className="text-foreground">{a.text}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground mono whitespace-nowrap">
                      {a.at}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Upcoming maturities */}
        <DashboardCard
          title="Upcoming maturities"
          subtitle="Next 90 days"
          action={
            <Link
              href="/admin/servicing"
              className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Servicing <ArrowRight className="h-3 w-3" />
            </Link>
          }
          noContentPadding
        >
          {maturingSoon.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing maturing in 90 days"
              description="Loans approaching their maturity date will appear here so you can engage the borrower in time."
              size="compact"
            />
          ) : (
            <ul>
              {maturingSoon.slice(0, 5).map((l) => {
                const days = l.maturity_date
                  ? Math.ceil(
                      (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0;
                const tone =
                  days < 0 || days < 30
                    ? "danger"
                    : days < 60
                      ? "warning"
                      : "neutral";
                const pct = Math.max(0, Math.min(1, 1 - days / 90));
                return (
                  <li key={l.id}>
                    <Link
                      href={`/admin/loans/${l.id}`}
                      className="grid grid-cols-[1fr_auto_140px] gap-4 items-center px-5 py-3 border-t first:border-t-0 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate text-[13px]">
                          {l.property
                            ? `${l.property.address_street}, ${l.property.address_city}`
                            : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground mono mt-0.5">
                          {l.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      <div className="mono text-[13px] text-right">
                        {formatCurrency(l.current_principal)}
                      </div>
                      <div>
                        <div className="relative h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 bottom-0 rounded-full ${
                              tone === "danger"
                                ? "bg-primary"
                                : tone === "warning"
                                  ? "bg-[color:var(--status-warning)]"
                                  : "bg-[color:var(--status-info)]"
                            }`}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <div className="text-[11px] mono text-muted-foreground mt-1.5 text-right">
                          {days < 0
                            ? `${Math.abs(days)}d overdue`
                            : `${days}d`}{" "}
                          · {formatDate(l.maturity_date)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>

        {/* This week */}
        <DashboardCard
          title="This week"
          subtitle="Actions for you"
          noContentPadding
        >
          {actions.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="You're all caught up"
              description="Approvals, late payments, draw reviews, and other action items will surface here."
              size="compact"
            />
          ) : (
            <ul>
              {actions.slice(0, 4).map((t, idx) => (
                <li key={idx}>
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-center px-5 py-3 border-t first:border-t-0">
                    <Link
                      href={t.href}
                      className="min-w-0 hover:bg-transparent"
                    >
                      <div className="mono text-[11px] text-muted-foreground">
                        {t.who}
                      </div>
                      <div className="text-[13px] mt-0.5">{t.text}</div>
                    </Link>
                    <Button
                      nativeButton={false}
                      size="sm"
                      variant={t.tone === "outline" ? "outline" : t.tone === "destructive" ? "destructive" : "default"}
                      render={<Link href={t.href} />}
                    >
                      {t.label}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      {/* Insurance attention */}
      {insuranceAttention.length > 0 && (
        <DashboardCard
          title={
            <span className="inline-flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Insurance attention
            </span>
          }
          subtitle={`${insuranceAttention.length} loan${insuranceAttention.length === 1 ? "" : "s"} need attention`}
          noContentPadding
        >
          <ul>
            {insuranceAttention.slice(0, 5).map((l) => {
              const missing = !l.insurance_carrier;
              const days =
                !missing && l.insurance_expiration_date
                  ? Math.ceil(
                      (new Date(
                        l.insurance_expiration_date + "T00:00:00Z"
                      ).getTime() -
                        now) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;
              return (
                <li key={l.id}>
                  <Link
                    href={`/admin/loans/${l.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 border-t first:border-t-0 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate text-[13px]">
                        {l.property
                          ? `${l.property.address_street}, ${l.property.address_city}`
                          : "—"}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">
                        {missing
                          ? "No carrier on file"
                          : l.insurance_carrier}
                      </div>
                    </div>
                    <StatusBadge tone="danger">
                      {missing
                        ? "Missing"
                        : days !== null && days < 0
                          ? `${Math.abs(days)}d expired`
                          : `${days}d`}
                    </StatusBadge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      )}

      {/* Loans by status */}
      <DashboardCard
        title="Loans by status"
        subtitle="Across the full lifecycle"
        noContentPadding
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9">
          {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((status, i, arr) => {
            const count = statusCounts[status] || 0;
            return (
              <div
                key={status}
                className={`px-4 py-4 ${i < arr.length - 1 ? "lg:border-r" : ""} ${i % 5 !== 4 ? "sm:border-r" : ""} ${i % 3 !== 2 ? "border-r" : ""} ${i >= 3 && i < 6 ? "border-t sm:border-t-0" : ""} ${i >= 6 ? "border-t lg:border-t-0" : ""}`}
              >
                <div
                  className={`mono text-[26px] font-semibold tracking-[-0.025em] leading-none ${count > 0 ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {count}
                </div>
                <div className="mt-1.5">
                  <StatusBadge tone={loanStatusTone(status)} dot>
                    {LOAN_STATUS_LABELS[status]}
                  </StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      {/* Defaulted alert (if any) */}
      {defaultedLoans.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.04] px-5 py-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium">
              {defaultedLoans.length} loan{defaultedLoans.length === 1 ? "" : "s"} in default
            </div>
            <div className="text-[12px] text-muted-foreground">
              Contact borrowers and review default interest rate application.
            </div>
          </div>
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link href="/admin/loans?status=defaulted" />}
          >
            Review
          </Button>
        </div>
      )}
    </div>
  );
}
