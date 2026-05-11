import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, propertyAddress } from "@/lib/format";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "outline",
  inspected: "secondary",
  approved: "default",
  funded: "default",
  rejected: "destructive",
};

const STAGES = [
  { key: "requested", label: "Awaiting Inspection" },
  { key: "inspected", label: "Inspected — Needs Approval" },
  { key: "approved", label: "Approved — Ready to Disburse" },
  { key: "funded", label: "Funded" },
  { key: "rejected", label: "Rejected" },
];

export default async function DrawsWorklistPage() {
  const supabase = await createClient();

  const { data: draws } = await supabase
    .from("draws")
    .select(`
      *,
      loan:loans(
        id,
        property:properties(address_street, address_city, address_state, address_zip)
      ),
      approvals:draw_approvals(approver_id)
    `)
    .order("requested_at", { ascending: false });

  const byStage = STAGES.map((s) => ({
    ...s,
    draws: (draws || []).filter((d) => d.status === s.key),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Draws</h1>
      <p className="text-sm text-muted-foreground -mt-4">
        All draw requests across loans, grouped by stage.
      </p>

      {byStage.map((stage) => (
        <Card key={stage.key}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[stage.key]}>{stage.label}</Badge>
              <span className="text-xs font-normal text-muted-foreground">
                {stage.draws.length} draw{stage.draws.length === 1 ? "" : "s"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stage.draws.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                None
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead>Approvals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stage.draws.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.loan?.property ? (
                          <Link
                            href={`/admin/loans/${d.loan.id}`}
                            className="font-medium hover:underline"
                          >
                            {propertyAddress(d.loan.property)}
                          </Link>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell>{formatDate(d.requested_at)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(d.requested_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.approved_amount
                          ? formatCurrency(d.approved_amount)
                          : "--"}
                      </TableCell>
                      <TableCell>{d.approvals?.length || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
