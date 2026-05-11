import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRate, formatDate, propertyAddress } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { ArrowRight } from "lucide-react";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function PortalDashboard() {
  const supabase = await createClient();

  const [{ data: loans }, { data: notifications }] = await Promise.all([
    supabase
      .from("loans")
      .select(`
        *,
        property:properties(*)
      `)
      .order("status", { ascending: true }),
    supabase
      .from("notifications")
      .select("id, subject, body, event_type, created_at, related_loan_id")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Loans</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your active loans and applications.
        </p>
      </div>

      {!loans?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No loans on file yet. If you&apos;ve recently submitted an application,
            check back soon.
          </CardContent>
        </Card>
      ) : (
        (() => {
          const active = loans.filter((l) =>
            ["lead", "application", "underwriting", "approved", "funded", "active", "defaulted", "foreclosure"].includes(
              l.status
            )
          );
          const closed = loans.filter((l) => l.status === "paid_off");

          return (
            <>
              {active.length > 0 && (
                <div className="grid gap-4">
                  {active.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} />
                  ))}
                </div>
              )}

              {closed.length > 0 && (
                <details className="group" open={active.length === 0}>
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-3 hover:text-foreground inline-flex items-center gap-1.5">
                    Paid Off ({closed.length})
                    <span className="text-xs group-open:rotate-90 transition-transform">
                      ▶
                    </span>
                  </summary>
                  <div className="grid gap-4">
                    {closed.map((loan) => (
                      <LoanCard key={loan.id} loan={loan} muted />
                    ))}
                  </div>
                </details>
              )}
            </>
          );
        })()
      )}

      {(notifications || []).length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
            <Link
              href="/portal/notifications"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(notifications || []).map((n) => (
                <li key={n.id} className="flex justify-between items-start gap-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{n.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                    </div>
                  </div>
                  {n.related_loan_id && (
                    <Link
                      href={`/portal/loans/${n.related_loan_id}`}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      View →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${highlight ? "text-destructive" : ""}`}>
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
  loan_amount: number;
  property: {
    address_street: string;
    address_city: string;
    address_state: string;
    address_zip: string;
  } | null;
}

function LoanCard({ loan, muted = false }: { loan: PortalLoan; muted?: boolean }) {
  const daysToMaturity = daysUntil(loan.maturity_date);
  return (
    <Link href={`/portal/loans/${loan.id}`} className="block">
      <Card
        className={`hover:bg-muted/30 transition-colors ${muted ? "opacity-75" : ""}`}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="text-base">
              {loan.property ? propertyAddress(loan.property) : "Loan"}
            </CardTitle>
            <Badge variant="outline" className="mt-2">
              {LOAN_STATUS_LABELS[loan.status as LoanStatus]}
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4 text-sm">
            {loan.status === "paid_off" ? (
              <>
                <Stat label="Original Amount" value={formatCurrency(loan.loan_amount)} />
                <Stat label="Rate" value={formatRate(loan.interest_rate)} />
                <Stat label="Paid Off" value={formatDate(loan.maturity_date)} />
              </>
            ) : (
              <>
                <Stat label="Current Balance" value={formatCurrency(loan.current_principal)} />
                <Stat label="Rate" value={formatRate(loan.interest_rate)} />
                <Stat label="Maturity" value={formatDate(loan.maturity_date)} />
                <Stat
                  label="Days Remaining"
                  value={
                    daysToMaturity === null
                      ? "--"
                      : daysToMaturity < 0
                        ? `${Math.abs(daysToMaturity)}d overdue`
                        : `${daysToMaturity}d`
                  }
                  highlight={daysToMaturity !== null && daysToMaturity < 30}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
