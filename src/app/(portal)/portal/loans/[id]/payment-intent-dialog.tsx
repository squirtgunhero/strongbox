"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Send } from "lucide-react";
import { submitPaymentIntent } from "./payment-intent-actions";

export function PaymentIntentDialog({ loanId }: { loanId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError("");
    try {
      await submitPaymentIntent(loanId, formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Send className="mr-2 h-3 w-3" />
        Notify Payment Sent
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>I sent a payment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Let your loan officer know you&apos;ve sent funds. They&apos;ll
            confirm when they hit our account.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select name="method" defaultValue="wire">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wire">Wire</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cashiers_check">Cashier&apos;s Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sent_date">Sent Date</Label>
              <Input
                id="sent_date"
                name="sent_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_arrival_date">Expected Arrival</Label>
              <Input
                id="expected_arrival_date"
                name="expected_arrival_date"
                type="date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference / Tracking #</Label>
            <Input
              id="reference_number"
              name="reference_number"
              placeholder="Wire confirmation, check number, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Submitting..." : "Submit Notice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
