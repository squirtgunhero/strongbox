import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, propertyAddress } from "@/lib/format";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  interest: "Interest",
  principal: "Principal",
  late_fee: "Late Fee",
  default_interest: "Default Interest",
  payoff: "Payoff",
  escrow: "Escrow",
};

export default async function PortalPayments() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      loan:loans(property:properties(address_street, address_city, address_state, address_zip))
    `)
    .order("due_date", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.due_date)}</TableCell>
                    <TableCell>{formatDate(p.received_date)}</TableCell>
                    <TableCell>
                      {p.loan?.property ? (
                        <Link
                          href={`/portal/loans/${p.loan_id}`}
                          className="hover:underline"
                        >
                          {propertyAddress(p.loan.property)}
                        </Link>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                    <TableCell>
                      {PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
