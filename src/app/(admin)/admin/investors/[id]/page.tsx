import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOrgAdminClient } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/auth/require-staff";
import { decryptFieldSafe } from "@/lib/crypto";
import { InvestorEditForm } from "./investor-edit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { InvestorInviteButton } from "./invite-button";
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

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: investor } = await supabase
    .from("investors")
    .select(`
      *,
      positions:investor_positions(
        *,
        loan:loans(
          id,
          status,
          loan_amount,
          interest_rate,
          property:properties(address_street, address_city, address_state, address_zip)
        )
      ),
      distributions:investor_distributions(*)
    `)
    .eq("id", id)
    .single();

  if (!investor) notFound();

  // tax_id_encrypted is column-grant-restricted to service_role.
  const caller = await getCaller();
  const admin = createOrgAdminClient(caller.orgId);
  let taxIdLastFour: string | null = null;
  if (admin) {
    const { data: pii } = await admin
      .from("investors")
      .select("tax_id_encrypted")
      .eq("id", id)
      .single();
    if (pii) {
      const taxId = await decryptFieldSafe(pii.tax_id_encrypted);
      taxIdLastFour = taxId ? taxId.replace(/\D/g, "").slice(-4) || null : null;
    }
  }

  const name =
    investor.investor_type === "entity"
      ? investor.entity_name
      : investor.full_name;

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

  const lastYear = new Date().getFullYear() - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">
              {investor.investor_type === "entity" ? "Entity" : "Individual"}
            </Badge>
            <span>{investor.email}</span>
            {investor.phone && <span>· {investor.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <InvestorInviteButton
            investorId={investor.id}
            alreadyLinked={!!investor.user_id}
          />
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/documents/investor/${investor.id}/1099?year=${lastYear}`}
                target="_blank"
              />
            }
          >
            <Receipt className="mr-2 h-3 w-3" />
            {lastYear} Year-End Summary
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Committed" value={formatCurrency(investor.committed_capital)} />
        <Stat label="Deployed" value={formatCurrency(deployed)} />
        <Stat
          label="Available"
          value={formatCurrency(Number(investor.committed_capital) - deployed)}
        />
        <Stat
          label="YTD Return (annualized)"
          value={`${(ytd.annualizedReturn * 100).toFixed(2)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <InvestorEditForm
            investor={{
              id: investor.id,
              investor_type: investor.investor_type,
              full_name: investor.full_name,
              entity_name: investor.entity_name,
              email: investor.email,
              phone: investor.phone,
              committed_capital: Number(investor.committed_capital),
              notes: investor.notes,
            }}
            tax_id_last_four={taxIdLastFour}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {!investor.positions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No positions yet. Assign positions from a loan&apos;s detail page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
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
                        loan_amount: number;
                        interest_rate: number;
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
                            href={`/admin/loans/${p.loan.id}`}
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
          <CardTitle className="text-sm">Distributions</CardTitle>
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
                  <TableHead>Loan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investor.distributions.map(
                  (d: {
                    id: string;
                    amount: number;
                    distribution_date: string;
                    loan_id: string;
                  }) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.distribution_date)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/loans/${d.loan_id}`}
                          className="hover:underline"
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
