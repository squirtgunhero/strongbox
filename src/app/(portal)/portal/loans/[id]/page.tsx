import { notFound } from "next/navigation";
import Link from "next/link";
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
import { formatCurrency, formatRate, formatDate, propertyAddress } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { PayoffCalculator } from "@/app/(admin)/admin/loans/[id]/payoff-calculator";
import { ChevronLeft } from "lucide-react";
import { remainingHoldback } from "@/lib/calculations/holdback";
import { DrawRequest } from "./draw-request";
import { Button } from "@/components/ui/button";
import { Receipt, Mail, Download } from "lucide-react";
import { DocumentUpload } from "./document-upload";
import { DownloadButton } from "@/app/(portal)/portal/documents/download-button";
import { InsuranceCard } from "./insurance-card";
import { PaymentIntentDialog } from "./payment-intent-dialog";
import { LoanHistory } from "@/components/loan-history";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  interest: "Interest",
  principal: "Principal",
  late_fee: "Late Fee",
  default_interest: "Default Interest",
  payoff: "Payoff",
  escrow: "Escrow",
};

export default async function PortalLoanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: loan } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(*)
    `)
    .eq("id", id)
    .single();

  if (!loan) notFound();

  const [
    { data: payments },
    { data: draws },
    { data: docs },
    { data: history },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .eq("loan_id", id)
      .order("due_date", { ascending: false }),
    supabase
      .from("draws")
      .select("*, line_items:draw_line_items(description, amount)")
      .eq("loan_id", id)
      .order("requested_at", { ascending: false }),
    supabase
      .from("loan_documents")
      .select("*")
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("loan_history", { loan_id_arg: id }),
  ]);

  const lastInterestPayment = (payments || []).find((p) => p.applied_to_interest > 0);
  const rehabBudget = Number(loan.property?.rehab_budget) || 0;
  const holdbackLeft = remainingHoldback(rehabBudget, draws || []);

  return (
    <div className="space-y-6">
      <Link
        href="/portal"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to loans
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {loan.property ? propertyAddress(loan.property) : "Loan"}
          </h1>
          <Badge variant="outline" className="mt-2">
            {LOAN_STATUS_LABELS[loan.status as LoanStatus]}
          </Badge>
        </div>
        {["funded", "active", "defaulted"].includes(loan.status) && (
          <div className="flex gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href={`/documents/${loan.id}/payoff-letter`} target="_blank" />}
            >
              <Receipt className="mr-2 h-3 w-3" />
              Payoff Letter
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href={`/documents/${loan.id}/statement`} target="_blank" />}
            >
              <Mail className="mr-2 h-3 w-3" />
              Statement
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Loan Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Original Amount" value={formatCurrency(loan.loan_amount)} />
            <Row label="Current Balance" value={formatCurrency(loan.current_principal)} bold />
            <Row label="Interest Rate" value={formatRate(loan.interest_rate)} />
            <Row label="Term" value={`${loan.term_months} months`} />
            <Separator />
            <Row label="Funded" value={formatDate(loan.funded_date)} />
            <Row label="Maturity" value={formatDate(loan.maturity_date)} />
          </CardContent>
        </Card>

        {["funded", "active", "defaulted"].includes(loan.status) && (
          <PayoffCalculator
            loan={loan}
            paidThroughDate={lastInterestPayment?.received_date || null}
            outstandingLateFees={0}
          />
        )}
      </div>

      <InsuranceCard
        loanId={loan.id}
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

      {rehabBudget > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Draws</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(holdbackLeft)} available of{" "}
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rehabBudget)}
              </p>
            </div>
            {holdbackLeft > 0 && (
              <DrawRequest loanId={loan.id} remainingHoldback={holdbackLeft} />
            )}
          </CardHeader>
          <CardContent>
            {!draws?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No draws requested yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draws.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.requested_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                          Number(d.approved_amount ?? d.requested_amount)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Documents</CardTitle>
          <DocumentUpload loanId={loan.id} />
        </CardHeader>
        <CardContent>
          {!docs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents on this loan yet.
            </p>
          ) : (
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
                {docs.map((d) => (
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payment History</CardTitle>
          {["funded", "active", "defaulted"].includes(loan.status) && (
            <PaymentIntentDialog loanId={loan.id} />
          )}
        </CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.due_date)}</TableCell>
                    <TableCell>{formatDate(p.received_date)}</TableCell>
                    <TableCell>
                      {PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LoanHistory entries={(history || []) as never} />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
