import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoansFilter } from "./loans-filter";
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

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    officer?: string;
    maturity?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
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

  if (sp.status && sp.status !== "all") {
    query = query.eq("status", sp.status);
  }

  if (sp.officer && sp.officer !== "all") {
    if (sp.officer === "unassigned") {
      query = query.is("loan_officer_id", null);
    } else {
      query = query.eq("loan_officer_id", sp.officer);
    }
  }

  const { data: allLoans } = await query;

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "loan_officer"])
    .order("full_name", { ascending: true });

  // In-memory text search across property address and borrower name.
  // For larger datasets we'd push this to Postgres FTS or ilike.
  const search = sp.q?.trim().toLowerCase();
  let loans = search
    ? (allLoans || []).filter((l) => {
        const propStr = l.property
          ? `${l.property.address_street} ${l.property.address_city} ${l.property.address_state} ${l.property.address_zip}`.toLowerCase()
          : "";
        const borrowerStr = (l.loan_borrowers || [])
          .map(
            (lb: {
              borrower: {
                first_name?: string | null;
                last_name?: string | null;
                entity_name?: string | null;
              };
            }) =>
              [
                lb.borrower?.first_name,
                lb.borrower?.last_name,
                lb.borrower?.entity_name,
              ]
                .filter(Boolean)
                .join(" ")
          )
          .join(" ")
          .toLowerCase();
        return propStr.includes(search) || borrowerStr.includes(search);
      })
    : allLoans || [];

  // Maturity filter (computed in memory)
  if (sp.maturity && sp.maturity !== "all") {
    const now = Date.now();
    loans = loans.filter((l) => {
      if (!l.maturity_date) return false;
      const days = Math.ceil(
        (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
          (1000 * 60 * 60 * 24)
      );
      if (sp.maturity === "overdue") return days < 0;
      const limit = parseInt(sp.maturity || "0");
      return days >= 0 && days <= limit;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button nativeButton={false} render={<Link href="/admin/loans/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Loan
        </Button>
      </div>

      <LoansFilter staff={staff || []} />

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
