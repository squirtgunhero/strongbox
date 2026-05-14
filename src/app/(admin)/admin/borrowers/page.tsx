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
import { ListSearch } from "@/components/list-search";

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: allBorrowers } = await supabase
    .from("borrowers")
    .select("*")
    .order("created_at", { ascending: false });

  const search = sp.q?.trim().toLowerCase();
  const borrowers = search
    ? (allBorrowers || []).filter((b) => {
        const name = borrowerDisplayName(b).toLowerCase();
        return (
          name.includes(search) ||
          (b.email?.toLowerCase() || "").includes(search) ||
          (b.phone?.toLowerCase() || "").includes(search)
        );
      })
    : allBorrowers;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Borrowers</h1>
      <ListSearch placeholder="Search by name, email, or phone..." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-right">Deals</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!borrowers?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search
                    ? "No borrowers match your search."
                    : "No borrowers yet. They are created when you create a loan."}
                </TableCell>
              </TableRow>
            ) : (
              borrowers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/borrowers/${b.id}`}
                      className="hover:underline"
                    >
                      {borrowerDisplayName(b)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {b.borrower_type === "entity" ? "Entity" : "Individual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{b.email || "--"}</TableCell>
                  <TableCell className="hidden md:table-cell">{b.phone || "--"}</TableCell>
                  <TableCell className="text-right">{b.deals_completed}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(b.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
