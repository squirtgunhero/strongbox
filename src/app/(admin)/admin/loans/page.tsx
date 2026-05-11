import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { Plus } from "lucide-react";

const statusVariant: Record<LoanStatus, "default" | "secondary" | "destructive" | "outline"> = {
  lead: "outline",
  application: "outline",
  underwriting: "secondary",
  approved: "secondary",
  funded: "default",
  active: "default",
  paid_off: "secondary",
  defaulted: "destructive",
  foreclosure: "destructive",
};

export default async function LoansPage() {
  const supabase = await createClient();

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(*),
      loan_borrowers(
        is_primary,
        borrower:borrowers(*)
      ),
      loan_officer:profiles!loans_loan_officer_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button nativeButton={false} render={<Link href="/admin/loans/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Loan
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Loan Amount</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loans?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No loans yet.{" "}
                  <Link href="/admin/loans/new" className="underline">
                    Create the first one.
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => {
                const primary = loan.loan_borrowers?.find(
                  (lb: { is_primary: boolean }) => lb.is_primary
                );
                const borrowerName = primary?.borrower
                  ? primary.borrower.borrower_type === "entity"
                    ? primary.borrower.entity_name
                    : `${primary.borrower.first_name} ${primary.borrower.last_name}`
                  : "--";

                const address = loan.property
                  ? `${loan.property.address_street}, ${loan.property.address_city}`
                  : "--";

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
                    <TableCell>{borrowerName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[loan.status as LoanStatus]}>
                        {LOAN_STATUS_LABELS[loan.status as LoanStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.loan_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRate(loan.interest_rate)}
                    </TableCell>
                    <TableCell>{loan.term_months}mo</TableCell>
                    <TableCell>
                      {loan.loan_officer?.full_name || "--"}
                    </TableCell>
                    <TableCell>{formatDate(loan.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
