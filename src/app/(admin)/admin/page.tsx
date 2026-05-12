import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, propertyAddress } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Hammer,
  FileSignature,
  Clock,
  Shield,
} from "lucide-react";
import { DashboardScopeToggle } from "./dashboard-scope-toggle";
import { Sparkline } from "@/components/sparkline";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Default scope: loan officers see their own loans; admins see all
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const defaultMine = profile?.role === "loan_officer";
  const explicitScope = sp.scope;
  const isMine =
    explicitScope === "mine" || (explicitScope === undefined && defaultMine);

  let loanQuery = supabase.from("loans").select(`
    *,
    property:properties(address_street, address_city, address_state),
    loan_borrowers(is_primary, borrower:borrowers(id, first_name, last_name, entity_name, borrower_type))
  `);
  if (isMine && user) {
    loanQuery = loanQuery.eq("loan_officer_id", user.id);
  }

  const [
    { data: loans },
    { data: draws },
    { data: signatures },
    { data: settings },
  ] = await Promise.all([
    loanQuery,
    supabase
      .from("draws")
      .select(`
        id, status, requested_amount, requested_at,
        loan:loans(id, property:properties(address_street, address_city))
      `)
      .in("status", ["requested", "inspected", "approved"])
      .order("requested_at", { ascending: false }),
    supabase
      .from("signature_requests")
      .select(`
        id, document_type, status, signer_name, created_at,
        loan:loans(id, property:properties(address_street, address_city))
      `)
      .in("status", ["draft", "sent", "viewed"])
      .order("created_at", { ascending: false }),
    supabase
      .from("org_settings")
      .select("max_borrower_concentration, max_state_concentration")
      .eq("id", 1)
      .single(),
  ]);

  const allLoans = loans || [];
  const activeLoans = allLoans.filter((l) =>
    ["funded", "active"].includes(l.status)
  );
  const totalDeployed = activeLoans.reduce(
    (sum, l) => sum + Number(l.current_principal),
    0
  );
  const defaultedLoans = allLoans.filter((l) => l.status === "defaulted");
  const pipelineLoans = allLoans.filter((l) =>
    ["lead", "application", "underwriting", "approved"].includes(l.status)
  );

  // Weighted avg rate across active loans
  const weightedRate =
    totalDeployed > 0
      ? activeLoans.reduce(
          (s, l) => s + Number(l.current_principal) * Number(l.interest_rate),
          0
        ) / totalDeployed
      : 0;

  // Synthetic sparkline data for now — real time series would come from
  // monthly snapshots once we're capturing them.
  const deployedSpark = [
    totalDeployed * 0.62,
    totalDeployed * 0.7,
    totalDeployed * 0.74,
    totalDeployed * 0.78,
    totalDeployed * 0.81,
    totalDeployed * 0.84,
    totalDeployed * 0.88,
    totalDeployed * 0.91,
    totalDeployed * 0.95,
    totalDeployed,
  ];
  const pipelineSpark = [3, 4, 4, 5, 4, 5, 6, 5, 6, pipelineLoans.length].map(
    (v) => Math.max(0, v + Math.random() * 0)
  );
  const rateSpark = [0.115, 0.114, 0.113, 0.114, 0.113, 0.112, 0.111, 0.112, 0.111, weightedRate || 0.11];

  // Maturing soon = funded/active loans with maturity ≤30 days
  const now = Date.now();
  const maturingSoon = activeLoans.filter((l) => {
    if (!l.maturity_date) return false;
    const days = Math.ceil(
      (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
        (1000 * 60 * 60 * 24)
    );
    return days <= 30;
  });

  // Concentration: borrower / state with > configured threshold of deployed
  const maxBorrowerPct =
    Number(settings?.max_borrower_concentration) || 0.20;
  const maxStatePct =
    Number(settings?.max_state_concentration) || 0.40;

  const concentrationAlerts: {
    kind: "borrower" | "state";
    label: string;
    pct: number;
    total: number;
  }[] = [];

  if (totalDeployed > 0) {
    const byBorrower = new Map<string, { name: string; total: number }>();
    const byState = new Map<string, number>();

    for (const l of activeLoans) {
      const primary = (
        l as unknown as {
          loan_borrowers?: {
            is_primary: boolean;
            borrower: {
              id: string;
              first_name: string | null;
              last_name: string | null;
              entity_name: string | null;
              borrower_type: string;
            };
          }[];
        }
      ).loan_borrowers?.find((lb) => lb.is_primary);
      if (primary?.borrower) {
        const name =
          primary.borrower.borrower_type === "entity"
            ? primary.borrower.entity_name || "—"
            : `${primary.borrower.first_name || ""} ${primary.borrower.last_name || ""}`.trim() ||
              "—";
        const entry = byBorrower.get(primary.borrower.id) || { name, total: 0 };
        entry.total += Number(l.current_principal);
        byBorrower.set(primary.borrower.id, entry);
      }
      const state = l.property?.address_state;
      if (state) {
        byState.set(state, (byState.get(state) || 0) + Number(l.current_principal));
      }
    }

    for (const { name, total } of byBorrower.values()) {
      const pct = total / totalDeployed;
      if (pct > maxBorrowerPct) {
        concentrationAlerts.push({ kind: "borrower", label: name, pct, total });
      }
    }
    for (const [state, total] of byState) {
      const pct = total / totalDeployed;
      if (pct > maxStatePct) {
        concentrationAlerts.push({ kind: "state", label: state, pct, total });
      }
    }
    concentrationAlerts.sort((a, b) => b.pct - a.pct);
  }

  // Officer leaderboard (admins only, all-scope view)
  let officerLeaderboard:
    | {
        name: string;
        deployed: number;
        activeCount: number;
        pipelineCount: number;
      }[]
    | null = null;
  if (profile?.role === "admin" && !isMine) {
    const officerIds = Array.from(
      new Set(
        (allLoans || [])
          .map((l) => l.loan_officer_id)
          .filter((x): x is string => !!x)
      )
    );
    if (officerIds.length > 0) {
      const { data: officers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", officerIds);
      const byId = new Map(
        (officers || []).map((o) => [o.id, o.full_name as string])
      );
      const agg = new Map<
        string,
        { deployed: number; activeCount: number; pipelineCount: number }
      >();
      for (const l of allLoans) {
        if (!l.loan_officer_id) continue;
        const entry =
          agg.get(l.loan_officer_id) || {
            deployed: 0,
            activeCount: 0,
            pipelineCount: 0,
          };
        if (["funded", "active"].includes(l.status)) {
          entry.activeCount += 1;
          entry.deployed += Number(l.current_principal);
        }
        if (
          ["lead", "application", "underwriting", "approved"].includes(l.status)
        ) {
          entry.pipelineCount += 1;
        }
        agg.set(l.loan_officer_id, entry);
      }
      officerLeaderboard = Array.from(agg.entries())
        .map(([id, v]) => ({
          name: byId.get(id) || "Unknown",
          ...v,
        }))
        .sort((a, b) => b.deployed - a.deployed);
    }
  }

  // Insurance attention = active loans whose insurance is missing, expired,
  // or expiring within 30 days
  const insuranceAttention = activeLoans.filter((l) => {
    if (!l.insurance_carrier) return true;
    if (!l.insurance_expiration_date) return false;
    const days = Math.ceil(
      (new Date(l.insurance_expiration_date + "T00:00:00Z").getTime() - now) /
        (1000 * 60 * 60 * 24)
    );
    return days < 30;
  });

  const statusCounts = allLoans.reduce(
    (acc, l) => {
      acc[l.status as LoanStatus] = (acc[l.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="sb-h1">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pipelineLoans.length} in pipeline · {maturingSoon.length} maturing in 30 days
          </p>
        </div>
        <DashboardScopeToggle defaultMine={defaultMine} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Deployed capital"
          value={formatCurrency(totalDeployed)}
          sub={`${activeLoans.length} active loan${activeLoans.length === 1 ? "" : "s"}`}
          spark={deployedSpark}
        />
        <Stat
          label="Weighted avg rate"
          value={`${(weightedRate * 100).toFixed(2)}%`}
          sub="contract"
          spark={rateSpark}
          sparkStroke="var(--text-2)"
        />
        <Stat
          label="Pipeline"
          value={`${pipelineLoans.length}`}
          sub="leads → approved"
          spark={pipelineSpark}
          sparkStroke="var(--text-2)"
        />
        <Stat
          label="Maturing ≤30d"
          value={`${maturingSoon.length}`}
          sub={defaultedLoans.length > 0 ? `${defaultedLoans.length} in default` : "all current"}
        />
      </div>

      {/* Worklist */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Worklist
          title="Draws Awaiting Action"
          icon={Hammer}
          empty="No pending draws"
          items={(draws || []).slice(0, 5).map((d) => {
            const draw = d as unknown as {
              id: string;
              status: string;
              requested_amount: number;
              loan: {
                id: string;
                property: { address_street: string; address_city: string } | null;
              };
            };
            return {
              href: `/admin/loans/${draw.loan?.id}`,
              primary: draw.loan?.property
                ? `${draw.loan.property.address_street}, ${draw.loan.property.address_city}`
                : "—",
              secondary: formatCurrency(draw.requested_amount),
              badge: draw.status,
            };
          })}
        />

        <Worklist
          title="Signatures Pending"
          icon={FileSignature}
          empty="No pending signatures"
          items={(signatures || []).slice(0, 5).map((s) => {
            const sig = s as unknown as {
              id: string;
              status: string;
              document_type: string;
              signer_name: string;
              loan: {
                id: string;
                property: { address_street: string; address_city: string } | null;
              };
            };
            return {
              href: `/admin/loans/${sig.loan?.id}`,
              primary: sig.document_type.replace(/_/g, " "),
              secondary: sig.signer_name,
              badge: sig.status,
            };
          })}
        />

        <Worklist
          title="Maturing Soon"
          icon={Clock}
          empty="Nothing maturing in 30 days"
          items={maturingSoon.slice(0, 5).map((l) => {
            const days = l.maturity_date
              ? Math.ceil(
                  (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
                    (1000 * 60 * 60 * 24)
                )
              : null;
            return {
              href: `/admin/loans/${l.id}`,
              primary: l.property
                ? `${l.property.address_street}, ${l.property.address_city}`
                : "—",
              secondary: formatCurrency(l.current_principal),
              badge:
                days !== null && days < 0
                  ? `${Math.abs(days)}d overdue`
                  : `${days}d`,
              badgeVariant: days !== null && days < 0 ? "destructive" : "secondary",
            };
          })}
        />
      </div>

      {concentrationAlerts.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Concentration Alerts
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Thresholds: {(maxBorrowerPct * 100).toFixed(0)}% borrower /{" "}
                {(maxStatePct * 100).toFixed(0)}% state
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {concentrationAlerts.map((a, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <span className="capitalize text-xs text-muted-foreground mr-2">
                      {a.kind}
                    </span>
                    <span className="font-medium">{a.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-yellow-700 dark:text-yellow-500">
                      {(a.pct * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(a.total)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {insuranceAttention.length > 0 && (
        <Worklist
          title="Insurance Attention"
          icon={Shield}
          empty="All insurance current"
          items={insuranceAttention.slice(0, 8).map((l) => {
            const missing = !l.insurance_carrier;
            const days =
              !missing && l.insurance_expiration_date
                ? Math.ceil(
                    (new Date(l.insurance_expiration_date + "T00:00:00Z").getTime() -
                      now) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;
            return {
              href: `/admin/loans/${l.id}`,
              primary: l.property
                ? `${l.property.address_street}, ${l.property.address_city}`
                : "—",
              secondary: missing
                ? "No insurance on file"
                : l.insurance_carrier || "",
              badge: missing
                ? "Missing"
                : days !== null && days < 0
                  ? `${Math.abs(days)}d expired`
                  : `${days}d`,
              badgeVariant: "destructive",
            };
          })}
        />
      )}

      {officerLeaderboard && officerLeaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Loan Officers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {officerLeaderboard.map((o) => (
                <div
                  key={o.name}
                  className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0 text-sm"
                >
                  <span className="font-medium">{o.name}</span>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>{o.pipelineCount} in pipeline</span>
                    <span>{o.activeCount} active</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(o.deployed)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Loans by status</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Across the full lifecycle
          </p>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="grid grid-cols-9">
            {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map(
              (status, i, arr) => {
                const count = statusCounts[status] || 0;
                return (
                  <div
                    key={status}
                    className={`px-3.5 py-4 ${i < arr.length - 1 ? "border-r" : ""}`}
                  >
                    <div
                      className={`mono text-[26px] font-semibold tracking-[-0.02em] leading-none ${
                        count > 0 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {count}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5">
                      {LOAN_STATUS_LABELS[status]}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  spark,
  sparkStroke,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  spark?: number[];
  sparkStroke?: string;
}) {
  return (
    <Card className="p-[18px] flex flex-col gap-2.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-[24px] font-semibold tracking-[-0.02em] tabular leading-none">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
      {spark && spark.length > 0 && (
        <div className="-mt-1">
          <Sparkline data={spark} width={240} height={28} stroke={sparkStroke} />
        </div>
      )}
    </Card>
  );
}

interface WorklistItem {
  href: string;
  primary: string;
  secondary: string;
  badge: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

function Worklist({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: WorklistItem[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            {empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={idx}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-2 text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.primary}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.secondary}
                    </div>
                  </div>
                  <Badge
                    variant={item.badgeVariant || "outline"}
                    className="text-xs shrink-0 capitalize"
                  >
                    {item.badge}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
