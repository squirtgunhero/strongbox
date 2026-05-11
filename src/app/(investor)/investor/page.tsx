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
import { formatCurrency, formatDate, propertyAddress } from "@/lib/format";
import { ytdReturn } from "@/lib/calculations/distributions";

export default async function InvestorDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: investor } = await supabase
    .from("investors")
    .select(`
      *,
      positions:investor_positions(
        *,
        loan:loans(
          id, status, loan_amount, interest_rate, maturity_date,
          property:properties(address_street, address_city, address_state, address_zip)
        )
      ),
      distributions:investor_distributions(amount, distribution_date)
    `)
    .eq("user_id", user.id)
    .single();

  if (!investor) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Your investor account hasn&apos;t been linked yet. Contact your account
          manager.
        </CardContent>
      </Card>
    );
  }

  const deployed = (investor.positions || []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );
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

  const name =
    investor.investor_type === "entity"
      ? investor.entity_name
      : investor.full_name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {name}</h1>
        <p className="text-sm text-muted-foreground">
          Your portfolio overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Committed" value={formatCurrency(investor.committed_capital)} />
        <Stat label="Deployed" value={formatCurrency(deployed)} />
        <Stat
          label="YTD Distributions"
          value={formatCurrency(ytd.totalDistributed)}
        />
        <Stat
          label="YTD Return (annualized)"
          value={`${(ytd.annualizedReturn * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {!investor.positions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No positions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Maturity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investor.positions.map(
                  (
                    p: {
                      id: string;
                      amount: number;
                      percentage: number;
                      loan: {
                        id: string;
                        status: string;
                        interest_rate: number;
                        maturity_date: string | null;
                        property: {
                          address_street: string;
                          address_city: string;
                          address_state: string;
                          address_zip: string;
                        } | null;
                      };
                    }
                  ) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.loan.property ? (
                          <Link
                            href={`/investor/loans/${p.loan.id}`}
                            className="font-medium hover:underline"
                          >
                            {propertyAddress(p.loan.property)}
                          </Link>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.loan.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(Number(p.percentage) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {(Number(p.loan.interest_rate) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>{formatDate(p.loan.maturity_date)}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Distributions</CardTitle>
        </CardHeader>
        <CardContent>
          {!investor.distributions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No distributions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investor.distributions
                  .slice()
                  .sort(
                    (
                      a: { distribution_date: string },
                      b: { distribution_date: string }
                    ) => b.distribution_date.localeCompare(a.distribution_date)
                  )
                  .slice(0, 25)
                  .map(
                    (
                      d: { distribution_date: string; amount: number },
                      idx: number
                    ) => (
                      <TableRow key={idx}>
                        <TableCell>{formatDate(d.distribution_date)}</TableCell>
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
