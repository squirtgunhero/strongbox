"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { addInvestorPosition } from "@/app/(admin)/admin/investors/actions";

interface InvestorOption {
  id: string;
  full_name: string | null;
  entity_name: string | null;
  investor_type: string;
}

interface Position {
  id: string;
  amount: number;
  percentage: number;
  investor: InvestorOption;
}

export function InvestorPositions({
  loanId,
  loanAmount,
  positions,
  availableInvestors,
}: {
  loanId: string;
  loanAmount: number;
  positions: Position[];
  availableInvestors: InvestorOption[];
}) {
  const totalDeployed = positions.reduce(
    (s, p) => s + Number(p.amount),
    0
  );
  const remaining = loanAmount - totalDeployed;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Investors</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(totalDeployed)} of {formatCurrency(loanAmount)} placed
            · {formatCurrency(remaining)} remaining
          </p>
        </div>
        {remaining > 0 && availableInvestors.length > 0 && (
          <AssignDialog
            loanId={loanId}
            remaining={remaining}
            investors={availableInvestors}
          />
        )}
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No investor positions on this loan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => {
                const name =
                  p.investor.investor_type === "entity"
                    ? p.investor.entity_name
                    : p.investor.full_name;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/investors/${p.investor.id}`}
                        className="font-medium hover:underline"
                      >
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(Number(p.percentage) * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AssignDialog({
  loanId,
  remaining,
  investors,
}: {
  loanId: string;
  remaining: number;
  investors: InvestorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await addInvestorPosition(loanId, formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Assign Investor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Investor Position</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Investor</Label>
            <Select name="investor_id">
              <SelectTrigger>
                <SelectValue placeholder="Choose an investor..." />
              </SelectTrigger>
              <SelectContent>
                {investors.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.investor_type === "entity" ? i.entity_name : i.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Position Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              max={remaining}
              required
            />
            <p className="text-xs text-muted-foreground">
              Up to {formatCurrency(remaining)} remaining
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Assigning..." : "Assign Position"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
