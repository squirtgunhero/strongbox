"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { updatePaymentIntentStatus } from "@/app/(portal)/portal/loans/[id]/payment-intent-actions";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface PaymentIntent {
  id: string;
  amount: number;
  method: string;
  reference_number: string | null;
  sent_date: string;
  expected_arrival_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "outline",
  verified: "secondary",
  cleared: "default",
  rejected: "destructive",
};

export function PaymentIntentsSection({
  intents,
}: {
  intents: PaymentIntent[];
}) {
  if (intents.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Payment Notices from Borrower</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {intents.map((intent) => (
              <TableRow key={intent.id}>
                <TableCell className="text-xs">
                  {formatDate(intent.created_at)}
                </TableCell>
                <TableCell>{formatDate(intent.sent_date)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(intent.amount)}
                </TableCell>
                <TableCell className="capitalize text-sm">
                  {intent.method.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {intent.reference_number || "--"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[intent.status]}>
                    {intent.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <IntentActions intent={intent} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IntentActions({ intent }: { intent: PaymentIntent }) {
  const [loading, setLoading] = useState(false);

  async function handle(status: "verified" | "cleared" | "rejected") {
    setLoading(true);
    try {
      await updatePaymentIntentStatus(intent.id, status);
      toast.success(`Marked ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (intent.status === "submitted") {
    return (
      <div className="flex gap-1 justify-end">
        <Button
          size="xs"
          variant="outline"
          disabled={loading}
          onClick={() => handle("verified")}
        >
          Verify
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={loading}
          onClick={() => handle("rejected")}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  if (intent.status === "verified") {
    return (
      <Button
        size="xs"
        variant="default"
        disabled={loading}
        onClick={() => handle("cleared")}
      >
        <Check className="h-3 w-3 mr-1" />
        Mark Cleared
      </Button>
    );
  }
  return null;
}
