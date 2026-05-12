import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatRate,
  formatDate,
  propertyAddress,
} from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { ChevronLeft } from "lucide-react";
import { InsuranceDisplay } from "@/app/(admin)/admin/loans/[id]/insurance-display";
import { LoanHistory } from "@/components/loan-history";
import { DownloadButton } from "@/app/(portal)/portal/documents/download-button";

export default async function InvestorLoanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Load loan + the investor's position on it
  const [{ data: loan }, { data: investor }] = await Promise.all([
    supabase
      .from("loans")
      .select(`
        *,
        property:properties(*)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("investors")
      .select("id")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!loan || !investor) notFound();

  const [
    { data: position },
    { data: distributions },
    { data: history },
    { data: propertyDocs },
  ] = await Promise.all([
    supabase
      .from("investor_positions")
      .select("*")
      .eq("loan_id", id)
      .eq("investor_id", investor.id)
      .single(),
    supabase
      .from("investor_distributions")
      .select("*")
      .eq("loan_id", id)
      .eq("investor_id", investor.id)
      .order("distribution_date", { ascending: false }),
    supabase.rpc("loan_history", { loan_id_arg: id }),
    loan.property_id
      ? supabase
          .from("property_documents")
          .select("*")
          .eq("property_id", loan.property_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  if (!position) notFound();

  const totalDistributions = (distributions || []).reduce(
    (s: number, d: { amount: number }) => s + Number(d.amount),
    0
  );

  return (
    <div className="space-y-6">
      <Link
        href="/investor"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to portfolio
      </Link>

      <div>
        <h1 className="text-2xl font-bold">
          {loan.property ? propertyAddress(loan.property) : "Loan"}
        </h1>
        <Badge variant="outline" className="mt-2">
          {LOAN_STATUS_LABELS[loan.status as LoanStatus]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Your Investment" value={formatCurrency(position.amount)} />
            <Row
              label="Your Share"
              value={`${(Number(position.percentage) * 100).toFixed(2)}%`}
            />
            <Separator />
            <Row
              label="Total Received"
              value={formatCurrency(totalDistributions)}
            />
            <Row label="Position Opened" value={formatDate(position.created_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Loan Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Loan Amount" value={formatCurrency(loan.loan_amount)} />
            <Row
              label="Current Balance"
              value={formatCurrency(loan.current_principal)}
            />
            <Row label="Interest Rate" value={formatRate(loan.interest_rate)} />
            <Row label="Term" value={`${loan.term_months} months`} />
            <Separator />
            <Row label="Funded" value={formatDate(loan.funded_date)} />
            <Row label="Maturity" value={formatDate(loan.maturity_date)} />
          </CardContent>
        </Card>
      </div>

      {["funded", "active", "defaulted"].includes(loan.status) && (
        <InsuranceDisplay
          insurance={{
            insurance_carrier: loan.insurance_carrier ?? null,
            insurance_policy_number: loan.insurance_policy_number ?? null,
            insurance_coverage_amount: loan.insurance_coverage_amount ?? null,
            insurance_expiration_date: loan.insurance_expiration_date ?? null,
            insurance_agent_name: loan.insurance_agent_name ?? null,
            insurance_agent_email: loan.insurance_agent_email ?? null,
            insurance_agent_phone: loan.insurance_agent_phone ?? null,
            insurance_updated_at: loan.insurance_updated_at ?? null,
          }}
        />
      )}

      {(propertyDocs || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Property Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(propertyDocs || []).map(
                  (d: {
                    id: string;
                    filename: string;
                    category: string;
                    storage_path: string;
                    created_at: string;
                  }) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.filename}</TableCell>
                      <TableCell className="capitalize">
                        {d.category.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>{formatDate(d.created_at)}</TableCell>
                      <TableCell>
                        <DownloadButton storagePath={d.storage_path} />
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Distributions on This Loan</CardTitle>
        </CardHeader>
        <CardContent>
          {!distributions?.length ? (
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
                {distributions.map(
                  (d: { id: string; distribution_date: string; amount: number }) => (
                    <TableRow key={d.id}>
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

      <LoanHistory entries={(history || []) as never} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
