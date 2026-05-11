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
    property:properties(address_street, address_city, address_state)
  `);
  if (isMine && user) {
    loanQuery = loanQuery.eq("loan_officer_id", user.id);
  }

  const [
    { data: loans },
    { data: draws },
    { data: signatures },
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DashboardScopeToggle defaultMine={defaultMine} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={DollarSign}
          label="Total Deployed"
          value={formatCurrency(totalDeployed)}
          sub={`${activeLoans.length} active`}
        />
        <Stat
          icon={FileText}
          label="Pipeline"
          value={`${pipelineLoans.length}`}
          sub="Leads → Approved"
        />
        <Stat
          icon={AlertTriangle}
          label="Defaulted"
          value={`${defaultedLoans.length}`}
          sub="Non-performing"
        />
        <Stat
          icon={Clock}
          label="Maturing ≤30d"
          value={`${maturingSoon.length}`}
          sub="Need attention"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Loans by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((status) => (
              <div key={status} className="text-center">
                <div className="text-lg font-semibold">
                  {statusCounts[status] || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {LOAN_STATUS_LABELS[status]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
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
