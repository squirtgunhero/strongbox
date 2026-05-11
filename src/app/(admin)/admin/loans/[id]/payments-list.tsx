import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  interest: "Interest",
  principal: "Principal",
  late_fee: "Late Fee",
  default_interest: "Default Interest",
  payoff: "Payoff",
  escrow: "Escrow",
};

export function PaymentsList({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No payments recorded yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Due Date</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Interest</TableHead>
          <TableHead className="text-right">Principal</TableHead>
          <TableHead className="text-right">Late Fees</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{formatDate(p.due_date)}</TableCell>
            <TableCell>{formatDate(p.received_date)}</TableCell>
            <TableCell>{TYPE_LABELS[p.payment_type] || p.payment_type}</TableCell>
            <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(p.applied_to_interest)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(p.applied_to_principal)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(p.applied_to_late_fees)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
