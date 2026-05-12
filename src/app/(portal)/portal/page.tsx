import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRate, formatDate } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { DownloadButton } from "./documents/download-button";
import {
  ArrowRight,
  BadgeDollarSign,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function daysUntil(dateStr: string | null, nowTs: number): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.ceil((target - nowTs) / (1000 * 60 * 60 * 24));
}

function loanAddress(loan: PortalLoan): string {
  const property = loan.property;
  if (!property) return "Property not set";
  return [
    property.address_street || "",
    property.address_city || "",
    property.address_state || "",
  ]
    .filter(Boolean)
    .join(", ");
}

function drawStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default async function PortalDashboard() {
  const nowTs = new Date().getTime();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: loans }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user?.id ?? "")
      .single(),
    supabase
      .from("loans")
      .select(`
        *,
        property:properties(*)
      `)
      .order("status", { ascending: true }),
  ]);

  const primaryLoan = (loans || []).find((loan) =>
    ["funded", "active", "approved", "defaulted"].includes(loan.status)
  ) || (loans || [])[0];

  const [{ data: payments }, { data: draws }, { data: documents }] = primaryLoan
    ? await Promise.all([
        supabase
          .from("payments")
          .select("id, due_date, received_date, amount, payment_type")
          .eq("loan_id", primaryLoan.id)
          .order("due_date", { ascending: false })
          .limit(8),
        supabase
          .from("draws")
          .select("id, status, requested_amount, approved_amount, requested_at")
          .eq("loan_id", primaryLoan.id)
          .order("requested_at", { ascending: true })
          .limit(8),
        supabase
          .from("loan_documents")
          .select("id, filename, category, created_at, storage_path")
          .eq("loan_id", primaryLoan.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const nextPayment = (payments || [])
    .filter((payment) => !payment.received_date && payment.due_date)
    .sort(
      (a, b) =>
        new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime()
    )[0];
  const daysToNextPayment = daysUntil(nextPayment?.due_date ?? null, nowTs);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";

  const rehabBudget = Number(primaryLoan?.property?.rehab_budget) || 0;
  const fundedDrawAmount = (draws || []).reduce((sum, draw) => {
    if (draw.status !== "funded") return sum;
    return sum + Number(draw.approved_amount ?? draw.requested_amount ?? 0);
  }, 0);
  const drawProgressPct =
    rehabBudget > 0 ? Math.min(100, (fundedDrawAmount / rehabBudget) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[50px] font-semibold tracking-[-0.04em] leading-[0.96] text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          {(loans || []).length} active loan{(loans || []).length === 1 ? "" : "s"}
          {daysToNextPayment !== null ? ` · next payment in ${Math.max(daysToNextPayment, 0)} days` : ""}
        </p>
      </div>

      {!primaryLoan ? (
        <div className="rounded-2xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          No loans on file yet. If you recently submitted an application, check back soon.
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]">
                  Current
                </Badge>
              </div>
              <h2 className="text-[36px] font-semibold tracking-[-0.03em] leading-[1.02]">
                {loanAddress(primaryLoan)}
              </h2>
              <div className="mt-1 text-[10.5px] text-muted-foreground">
                {primaryLoan.property?.address_zip || "—"} · {primaryLoan.id.slice(0, 8).toUpperCase()}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <Stat label="Balance" value={formatCurrency(primaryLoan.current_principal)} />
                <Stat label="Rate" value={formatRate(primaryLoan.interest_rate)} />
                <Stat label="Matures" value={formatDate(primaryLoan.maturity_date)} />
              </div>
            </div>
            <div className="rounded-xl border bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(0,0,0,0.015)_10px,rgba(0,0,0,0.015)_20px)] p-4">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                Loan status
              </div>
              <div className="mt-2 text-[13.5px] font-medium">
                {LOAN_STATUS_LABELS[primaryLoan.status as LoanStatus] || primaryLoan.status}
              </div>
              <div className="mt-4 text-[13.5px] text-muted-foreground">
                View full details, statements, payoff request, and servicing updates.
              </div>
              <Button
                nativeButton={false}
                size="xs"
                variant="outline"
                className="mt-4"
                render={<Link href={`/portal/loans/${primaryLoan.id}`} />}
              >
                Open loan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4 shadow-[var(--shadow-card)]">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Next payment due</div>
              <div className="tabular text-[42px] font-semibold tracking-[-0.03em] leading-none">
                {nextPayment ? formatCurrency(nextPayment.amount) : "—"}
              </div>
              <div className="text-[13.5px] text-muted-foreground">
                {nextPayment ? `${formatDate(nextPayment.due_date)} · interest-only` : "No scheduled payment"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href={`/portal/loans/${primaryLoan.id}`} />}
              >
                Schedule autopay
              </Button>
              <Button
                nativeButton={false}
                size="sm"
                render={<Link href={`/portal/loans/${primaryLoan.id}`} />}
              >
                Pay now
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href={`/portal/loans/${primaryLoan.id}`}
              title="Request draw"
              subtitle={`${formatCurrency(Math.max(0, rehabBudget - fundedDrawAmount))} remaining`}
              icon={BadgeDollarSign}
            />
            <QuickAction
              href={`/portal/loans/${primaryLoan.id}`}
              title="Request payoff"
              subtitle="PDF in seconds"
              icon={FileText}
            />
            <QuickAction
              href={`/portal/loans/${primaryLoan.id}`}
              title="Update insurance"
              subtitle="Renewals and policy details"
              icon={ShieldCheck}
            />
            <QuickAction
              href={`/portal/documents`}
              title="Upload documents"
              subtitle="Invoices, photos, and forms"
              icon={Upload}
            />
          </div>

          {rehabBudget > 0 && (
            <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold">Rehab progress</div>
                  <div className="text-[13.5px] text-muted-foreground">
                    Draw {draws?.length || 0} inspection scheduled
                  </div>
                </div>
                <div className="text-[13.5px] font-medium">
                  {formatCurrency(fundedDrawAmount)} / {formatCurrency(rehabBudget)}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[color:var(--status-success)]" style={{ width: `${drawProgressPct}%` }} />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(draws || []).slice(-4).map((draw, index) => (
                  <div key={draw.id} className="rounded-xl border bg-background px-3 py-2.5">
                    <div className="text-[10.5px] text-muted-foreground">Draw #{index + 1}</div>
                    <div className="tabular mt-1 text-[21px] font-semibold leading-none">
                      {formatCurrency(Number(draw.approved_amount ?? draw.requested_amount ?? 0))}
                    </div>
                    <div className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                      {drawStatusLabel(draw.status)}
                    </div>
                  </div>
                ))}
                {(draws || []).length === 0 && (
                  <div className="text-[12px] text-muted-foreground sm:col-span-2 lg:col-span-4">
                    No draws requested yet.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
              <div className="border-b px-5 py-4">
                <div className="text-[15px] font-semibold tracking-tight">Recent payments</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="bg-muted/40 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(payments || []).slice(0, 5).map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2.5">{formatDate(payment.received_date || payment.due_date)}</td>
                        <td className="px-4 py-2.5 capitalize">{payment.payment_type.replace(/_/g, " ")}</td>
                        <td className="tabular px-4 py-2.5 text-right font-medium">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                    {(payments || []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-muted-foreground">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
              <div className="border-b px-5 py-4">
                <div className="text-[15px] font-semibold tracking-tight">Your documents</div>
              </div>
              <ul className="divide-y">
                {(documents || []).slice(0, 4).map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{doc.filename}</div>
                      <div className="text-[10.5px] text-muted-foreground">{formatDate(doc.created_at)}</div>
                    </div>
                    <DownloadButton storagePath={doc.storage_path} />
                  </li>
                ))}
                {(documents || []).length === 0 && (
                  <li className="px-4 py-4 text-[12px] text-muted-foreground">
                    No documents available yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickAction({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold">{title}</div>
          <div className="text-[10.5px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="tabular text-[30px] font-semibold tracking-[-0.025em] leading-none">
        {value}
      </div>
    </div>
  );
}

interface PortalLoan {
  id: string;
  status: string;
  current_principal: number;
  interest_rate: number;
  maturity_date: string | null;
  property: {
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    rehab_budget: number | null;
  } | null;
}
