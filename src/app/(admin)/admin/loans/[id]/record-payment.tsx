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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordPayment } from "./payment-actions";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

interface OpenIntent {
  id: string;
  amount: number;
  method: string;
  sent_date: string;
  reference_number: string | null;
}

export function RecordPayment({
  loanId,
  openIntents = [],
}: {
  loanId: string;
  openIntents?: OpenIntent[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await recordPayment(loanId, formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" />}
      >
        <Plus className="mr-2 h-3 w-3" />
        Record Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select name="payment_type" defaultValue="interest">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                  <SelectItem value="payoff">Payoff</SelectItem>
                  <SelectItem value="escrow">Escrow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" name="due_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="received_date">Received Date</Label>
              <Input id="received_date" name="received_date" type="date" />
            </div>
          </div>
          {openIntents.length > 0 && (
            <div className="space-y-2">
              <Label>Match Pending Notice</Label>
              <Select name="match_intent_id" defaultValue="none">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No match</SelectItem>
                  {openIntents.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {formatCurrency(i.amount)} · {i.method} · sent{" "}
                      {formatDate(i.sent_date)}
                      {i.reference_number ? ` · ${i.reference_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking will mark the borrower&apos;s notice as cleared.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
