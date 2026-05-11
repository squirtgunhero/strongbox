import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { borrowerDisplayName, formatDate } from "@/lib/format";

export default async function BorrowersPage() {
  const supabase = await createClient();

  const { data: borrowers } = await supabase
    .from("borrowers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Borrowers</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Deals</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!borrowers?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No borrowers yet. They are created when you create a loan.
                </TableCell>
              </TableRow>
            ) : (
              borrowers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {borrowerDisplayName(b)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {b.borrower_type === "entity" ? "Entity" : "Individual"}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.email || "--"}</TableCell>
                  <TableCell>{b.phone || "--"}</TableCell>
                  <TableCell className="text-right">{b.deals_completed}</TableCell>
                  <TableCell>{formatDate(b.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
