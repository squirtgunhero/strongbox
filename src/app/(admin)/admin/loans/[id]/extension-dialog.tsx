"use client";

import { useState } from "react";
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
import { processExtension } from "./extension-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export function ExtensionDialog({
  loanId,
  loanAmount,
  currentMaturity,
  extensionCount,
  maxExtensions,
  defaultFeePoints,
}: {
  loanId: string;
  loanAmount: number;
  currentMaturity: string | null;
  extensionCount: number;
  maxExtensions: number | null;
  defaultFeePoints: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState("6");
  const [feePoints, setFeePoints] = useState(
    defaultFeePoints ? String(defaultFeePoints * 100) : "2"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Compute new maturity date based on months
  const newMaturity = currentMaturity
    ? (() => {
        const d = new Date(currentMaturity + "T00:00:00Z");
        d.setUTCMonth(d.getUTCMonth() + parseInt(months || "0"));
        return d.toISOString().split("T")[0];
      })()
    : "";

  const feeAmount = loanAmount * (parseFloat(feePoints || "0") / 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("new_maturity_date", newMaturity);
      fd.set("extension_months", months);
      fd.set("fee_points", feePoints);
      await processExtension(loanId, fd);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const atMax =
    maxExtensions !== null && extensionCount >= maxExtensions;

  if (atMax) {
    return (
      <span className="text-xs text-muted-foreground">
        Maximum extensions reached
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <Plus className="mr-1 h-3 w-3" />
        Process Extension
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Loan Extension</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="months">Extension (months)</Label>
              <Input
                id="months"
                type="number"
                min="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_points">Fee (points)</Label>
              <Input
                id="fee_points"
                type="number"
                step="0.01"
                min="0"
                value={feePoints}
                onChange={(e) => setFeePoints(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current maturity</span>
              <span>{formatDate(currentMaturity)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">New maturity</span>
              <span>{formatDate(newMaturity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extension fee</span>
              <span>{formatCurrency(feeAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extensions used</span>
              <span>
                {extensionCount + 1}
                {maxExtensions !== null && ` / ${maxExtensions}`}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Processing..." : "Process Extension"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
