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
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { requestDraw } from "@/lib/draws";

interface LineItem {
  description: string;
  amount: string;
}

export function DrawRequest({
  loanId,
  remainingHoldback,
}: {
  loanId: string;
  remainingHoldback: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const itemsTotal = items.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("amount", amount);
      fd.set("notes", notes);
      fd.set(
        "line_items",
        JSON.stringify(
          items
            .filter((i) => i.description && i.amount)
            .map((i) => ({
              description: i.description,
              amount: parseFloat(i.amount),
            }))
        )
      );
      await requestDraw(loanId, fd);
      setOpen(false);
      setAmount("");
      setNotes("");
      setItems([{ description: "", amount: "" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Request Draw</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Draw</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Available holdback: {formatCurrency(remainingHoldback)}
          </p>

          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <span className="text-xs text-muted-foreground">
                Total: {formatCurrency(itemsTotal)}
              </span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Description (e.g. Roof repair)"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  className="w-32"
                  value={item.amount}
                  onChange={(e) => updateItem(idx, "amount", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setItems(items.filter((_, i) => i !== idx))
                  }
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setItems([...items, { description: "", amount: "" }])}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add line item
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Draw Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
