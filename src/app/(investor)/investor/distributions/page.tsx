import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ytdReturn } from "@/lib/calculations/distributions";

export default async function InvestorDistributionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: investor } = await supabase
    .from("investors")
    .select(`
      committed_capital,
      distributions:investor_distributions(
        amount, distribution_date, loan_id
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (!investor) return null;

  const ytd = ytdReturn(
    (investor.distributions || []).map(
      (d: { amount: number; distribution_date: string }) => ({
        amount: Number(d.amount),
        distribution_date: d.distribution_date,
      })
    ),
    Number(investor.committed_capital),
    new Date().toISOString().split("T")[0]
  );

  const sorted = (investor.distributions || [])
    .slice()
    .sort(
      (
        a: { distribution_date: string },
        b: { distribution_date: string }
      ) => b.distribution_date.localeCompare(a.distribution_date)
    );

  const total = sorted.reduce(
    (s: number, d: { amount: number }) => s + Number(d.amount),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Distributions</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Lifetime" value={formatCurrency(total)} />
        <Stat label="YTD Distributions" value={formatCurrency(ytd.totalDistributed)} />
        <Stat
          label="YTD Return (annualized)"
          value={`${(ytd.annualizedReturn * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Distributions</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No distributions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(
                  (
                    d: {
                      amount: number;
                      distribution_date: string;
                      loan_id: string;
                    },
                    idx: number
                  ) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(d.distribution_date)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/investor/loans/${d.loan_id}`}
                          className="hover:underline text-xs font-mono"
                        >
                          {d.loan_id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(d.amount)}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
