import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  groupByMonth,
  agingBucket,
  weightedAverageRate,
  type AgingBucket,
} from "@/lib/calculations/reports";
import { Download } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(address_state, address_city)
    `);

  const all = loans || [];
  const today = new Date().toISOString().split("T")[0];

  // Portfolio summary
  const active = all.filter((l) =>
    ["funded", "active", "defaulted"].includes(l.status)
  );
  const totalDeployed = active.reduce(
    (s, l) => s + Number(l.current_principal),
    0
  );
  const totalOriginated = all.reduce(
    (s, l) => s + Number(l.loan_amount),
    0
  );
  const wAvgRate = weightedAverageRate(active);
  const defaulted = all.filter((l) => l.status === "defaulted").length;
  const paidOff = all.filter((l) => l.status === "paid_off").length;
  const defaultRate =
    all.length > 0 ? (defaulted / all.length) * 100 : 0;

  // Originations by month (funded_date)
  const originations = groupByMonth(
    all.filter((l) => l.funded_date),
    (l) => l.funded_date,
    (l) => Number(l.loan_amount)
  ).slice(-12); // last 12 months

  // Payoffs by month (paid_off loans grouped by updated_at)
  const payoffs = groupByMonth(
    all.filter((l) => l.status === "paid_off"),
    (l) => l.updated_at?.slice(0, 10) ?? null,
    (l) => Number(l.loan_amount)
  ).slice(-12);

  // Aging
  const aging: Record<AgingBucket, typeof active> = {
    current: [],
    "30": [],
    "60": [],
    "90": [],
    "90+": [],
  };
  for (const loan of active) {
    const b = agingBucket(loan.maturity_date, today);
    if (b) aging[b].push(loan);
  }

  // Concentration by state
  const byState = new Map<string, { count: number; total: number }>();
  for (const loan of active) {
    const state = loan.property?.address_state || "—";
    const b = byState.get(state) || { count: 0, total: 0 };
    b.count += 1;
    b.total += Number(loan.current_principal);
    byState.set(state, b);
  }
  const concentration = Array.from(byState.entries())
    .map(([state, { count, total }]) => ({
      state,
      count,
      total,
      pct: totalDeployed > 0 ? total / totalDeployed : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/api/reports/loans.csv" target="_blank" />}
          >
            <Download className="mr-2 h-3 w-3" />
            Loans CSV
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/api/reports/payments.csv" target="_blank" />}
          >
            <Download className="mr-2 h-3 w-3" />
            Payments CSV
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/api/reports/distributions.csv" target="_blank" />}
          >
            <Download className="mr-2 h-3 w-3" />
            Distributions CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Originated" value={formatCurrency(totalOriginated)} />
        <Stat label="Currently Deployed" value={formatCurrency(totalDeployed)} />
        <Stat label="Weighted Rate" value={formatRate(wAvgRate)} />
        <Stat
          label="Default Rate"
          value={`${defaultRate.toFixed(1)}% (${defaulted} of ${all.length})`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Originations by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {originations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No funded loans yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {originations.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payoffs by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {payoffs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No payoffs yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoffs.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
            {(["current", "30", "60", "90", "90+"] as AgingBucket[]).map((b) => {
              const loans = aging[b];
              const total = loans.reduce(
                (s, l) => s + Number(l.current_principal),
                0
              );
              return (
                <div key={b} className="space-y-1">
                  <Badge
                    variant={
                      b === "current"
                        ? "default"
                        : b === "90" || b === "90+"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {b === "current" ? "Current" : `${b} days`}
                  </Badge>
                  <div className="text-lg font-bold">{loans.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(total)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Concentration by State</CardTitle>
        </CardHeader>
        <CardContent>
          {concentration.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active loans.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Loans</TableHead>
                  <TableHead className="text-right">Deployed</TableHead>
                  <TableHead className="text-right">% of Portfolio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concentration.map((c) => (
                  <TableRow key={c.state}>
                    <TableCell className="font-medium">{c.state}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(c.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(c.pct * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-right">
        Generated {formatDate(today)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
