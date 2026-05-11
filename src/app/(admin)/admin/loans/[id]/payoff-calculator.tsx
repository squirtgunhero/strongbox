"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { calculatePayoff } from "@/lib/calculations/payoff";
import { formatCurrency } from "@/lib/format";
import type { DayCountConvention } from "@/lib/types";

interface PayoffCalculatorProps {
  loan: {
    current_principal: number;
    interest_rate: number;
    default_rate: number | null;
    day_count: DayCountConvention;
    is_defaulted: boolean;
    funded_date: string | null;
    // Last paid-through derived from latest interest payment due date; for now use funded_date
  };
  paidThroughDate: string | null;
  outstandingLateFees: number;
}

export function PayoffCalculator({
  loan,
  paidThroughDate,
  outstandingLateFees,
}: PayoffCalculatorProps) {
  const today = new Date().toISOString().split("T")[0];
  const defaultPaidThrough =
    paidThroughDate || loan.funded_date || today;

  const [payoffDate, setPayoffDate] = useState(today);
  const [paidThrough, setPaidThrough] = useState(defaultPaidThrough);

  const result = useMemo(() => {
    try {
      return calculatePayoff({
        currentPrincipal: Number(loan.current_principal),
        interestRate: Number(loan.interest_rate),
        defaultRate: loan.default_rate ? Number(loan.default_rate) : null,
        dayCount: loan.day_count,
        paidThroughDate: paidThrough,
        payoffDate,
        outstandingLateFees,
        isDefaulted: loan.is_defaulted,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid input" };
    }
  }, [loan, paidThrough, payoffDate, outstandingLateFees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Payoff Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paid_through">Paid Through</Label>
            <Input
              id="paid_through"
              type="date"
              value={paidThrough}
              onChange={(e) => setPaidThrough(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payoff_date">Payoff Date</Label>
            <Input
              id="payoff_date"
              type="date"
              value={payoffDate}
              onChange={(e) => setPayoffDate(e.target.value)}
            />
          </div>
        </div>

        {"error" in result ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Principal Balance" value={formatCurrency(result.principal)} />
            <Row
              label={`Accrued Interest (${result.daysAccrued} days)`}
              value={formatCurrency(result.accruedInterest)}
            />
            {result.lateFees > 0 && (
              <Row label="Outstanding Late Fees" value={formatCurrency(result.lateFees)} />
            )}
            <Row
              label="Per Diem"
              value={`${formatCurrency(result.perDiem)} / day`}
              muted
            />
            <Separator />
            <Row
              label="Total Payoff"
              value={formatCurrency(result.total)}
              bold
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground text-xs" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={bold ? "font-bold text-base" : muted ? "text-xs" : ""}>
        {value}
      </span>
    </div>
  );
}
