"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatRate, formatDate } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { SortableTH } from "@/components/sortable-th";
import { bulkAssignOfficer, bulkChangeStatus } from "./bulk-actions";
import { toast } from "sonner";

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

interface PageLoan {
  id: string;
  status: LoanStatus;
  loan_amount: number;
  interest_rate: number;
  term_months: number;
  maturity_date: string | null;
  created_at: string;
  property: {
    address_street: string;
    address_city: string;
  } | null;
  loan_borrowers: {
    is_primary: boolean;
    borrower: {
      borrower_type: string;
      first_name: string | null;
      last_name: string | null;
      entity_name: string | null;
    };
  }[];
  loan_officer: { full_name: string } | null;
}

interface Staff {
  id: string;
  full_name: string;
}

export function LoansTable({
  loans,
  staff,
}: {
  loans: PageLoan[];
  staff: Staff[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const allSelected =
    loans.length > 0 && loans.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(loans.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleBulkAssign(officerId: string | null) {
    if (!someSelected) return;
    setPending(true);
    try {
      const result = await bulkAssignOfficer(
        Array.from(selected),
        officerId
      );
      toast.success(`Assigned ${result.count} loan${result.count === 1 ? "" : "s"}`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function handleBulkStatus(newStatus: string) {
    if (!someSelected) return;
    setPending(true);
    try {
      const result = await bulkChangeStatus(
        Array.from(selected),
        newStatus
      );
      if (result.failures.length === 0) {
        toast.success(`Updated ${result.succeeded} loans`);
      } else {
        toast.warning(
          `${result.succeeded} updated, ${result.failures.length} failed (e.g. ${result.failures[0]?.error})`
        );
      }
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {someSelected && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="hidden text-xs text-muted-foreground sm:inline">Assign:</span>
            <Select
              onValueChange={(v) => {
                if (!v || typeof v !== "string") return;
                handleBulkAssign(v === "unassigned" ? null : v);
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Officer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden text-xs text-muted-foreground sm:inline">Move to:</span>
            <Select
              onValueChange={(v) => {
                if (!v || typeof v !== "string") return;
                handleBulkStatus(v);
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Status..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LOAN_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Property</TableHead>
              <TableHead className="hidden sm:table-cell">Borrower</TableHead>
              <SortableTH field="status">Status</SortableTH>
              <SortableTH field="loan_amount" align="right">Loan Amount</SortableTH>
              <SortableTH field="interest_rate" align="right" className="hidden lg:table-cell">Rate</SortableTH>
              <SortableTH field="term_months" className="hidden lg:table-cell">Term</SortableTH>
              <TableHead className="hidden xl:table-cell">Officer</TableHead>
              <SortableTH field="maturity_date" className="hidden md:table-cell">Maturity</SortableTH>
              <SortableTH field="created_at" className="hidden xl:table-cell">Created</SortableTH>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No loans match your filters.
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => {
                const primary = loan.loan_borrowers?.find(
                  (lb) => lb.is_primary
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
                      <input
                        type="checkbox"
                        checked={selected.has(loan.id)}
                        onChange={() => toggleOne(loan.id)}
                        aria-label={`Select ${address}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/loans/${loan.id}`}
                        className="font-medium hover:underline"
                      >
                        {address}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{borrowerName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[loan.status]}>
                        {LOAN_STATUS_LABELS[loan.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.loan_amount)}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {formatRate(loan.interest_rate)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{loan.term_months}mo</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {loan.loan_officer?.full_name || "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(loan.maturity_date)}</TableCell>
                    <TableCell className="hidden xl:table-cell">{formatDate(loan.created_at)}</TableCell>
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
