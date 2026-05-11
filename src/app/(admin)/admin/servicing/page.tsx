import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatRate, formatDate } from "@/lib/format";
import { DollarSign, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { GenerateStatementsButton } from "./generate-statements-button";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default async function ServicingPage() {
  const supabase = await createClient();

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(address_street, address_city, address_state),
      loan_borrowers(is_primary, borrower:borrowers(*))
    `)
    .in("status", ["active", "funded", "defaulted"])
    .order("maturity_date", { ascending: true, nullsFirst: false });

  const allLoans = loans || [];

  const totalDeployed = allLoans.reduce(
    (sum, l) => sum + Number(l.current_principal),
    0
  );
  const weightedRate =
    totalDeployed > 0
      ? allLoans.reduce(
          (sum, l) => sum + Number(l.current_principal) * Number(l.interest_rate),
          0
        ) / totalDeployed
      : 0;

  const performing = allLoans.filter((l) => !l.is_defaulted).length;
  const nonPerforming = allLoans.filter((l) => l.is_defaulted).length;

  // Maturity buckets
  const buckets = {
    "30": [] as typeof allLoans,
    "60": [] as typeof allLoans,
    "90": [] as typeof allLoans,
    overdue: [] as typeof allLoans,
  };
  for (const loan of allLoans) {
    const days = daysUntil(loan.maturity_date);
    if (days === null) continue;
    if (days < 0) buckets.overdue.push(loan);
    else if (days <= 30) buckets["30"].push(loan);
    else if (days <= 60) buckets["60"].push(loan);
    else if (days <= 90) buckets["90"].push(loan);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servicing</h1>
        <GenerateStatementsButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={DollarSign} label="Deployed Capital" value={formatCurrency(totalDeployed)} />
        <Stat icon={TrendingUp} label="Weighted Rate" value={formatRate(weightedRate)} />
        <Stat icon={AlertTriangle} label="Non-Performing" value={`${nonPerforming} / ${allLoans.length}`} />
        <Stat icon={Calendar} label="Maturing ≤30d" value={`${buckets["30"].length + buckets.overdue.length}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Maturity Worklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Overdue", loans: buckets.overdue, variant: "destructive" as const },
            { label: "Maturing in 30 days", loans: buckets["30"], variant: "default" as const },
            { label: "Maturing in 60 days", loans: buckets["60"], variant: "secondary" as const },
            { label: "Maturing in 90 days", loans: buckets["90"], variant: "outline" as const },
          ].map((bucket) => (
            <div key={bucket.label}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={bucket.variant}>{bucket.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {bucket.loans.length} loan{bucket.loans.length === 1 ? "" : "s"}
                </span>
              </div>
              {bucket.loans.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Maturity</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucket.loans.map((loan) => {
                      const primary = loan.loan_borrowers?.find(
                        (lb: { is_primary: boolean }) => lb.is_primary
                      );
                      const name = primary?.borrower
                        ? primary.borrower.borrower_type === "entity"
                          ? primary.borrower.entity_name
                          : `${primary.borrower.first_name} ${primary.borrower.last_name}`
                        : "--";
                      const address = loan.property
                        ? `${loan.property.address_street}, ${loan.property.address_city}`
                        : "--";
                      const days = daysUntil(loan.maturity_date);

                      return (
                        <TableRow key={loan.id}>
                          <TableCell>
                            <Link
                              href={`/admin/loans/${loan.id}`}
                              className="font-medium hover:underline"
                            >
                              {address}
                            </Link>
                          </TableCell>
                          <TableCell>{name}</TableCell>
                          <TableCell>{formatDate(loan.maturity_date)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(loan.current_principal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatRate(loan.interest_rate)}
                          </TableCell>
                          <TableCell
                            className={days !== null && days < 0 ? "text-destructive font-medium" : ""}
                          >
                            {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : "--"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
