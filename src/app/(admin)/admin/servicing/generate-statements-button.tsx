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
import { Mail } from "lucide-react";
import { generateMonthlyStatements } from "./batch-actions";
import { toast } from "sonner";

function defaultPeriod() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  return { from: toIso(start), to: toIso(end) };
}

export function GenerateStatementsButton() {
  const [open, setOpen] = useState(false);
  const period = defaultPeriod();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await generateMonthlyStatements(from, to);
      toast.success(
        `Statements: ${result.generated} queued, ${result.skipped} skipped (no email), ${result.failed} failed`
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Mail className="mr-2 h-3 w-3" />
        Generate Statements
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Monthly Statements</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Queue a statement notification for every active loan covering this
            period. Defaults to the previous calendar month.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from">Period Start</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Period End</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Generating..." : "Generate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
