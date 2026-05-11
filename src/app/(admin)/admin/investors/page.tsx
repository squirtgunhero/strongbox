import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
import { Plus } from "lucide-react";
import { ListSearch } from "@/components/list-search";

export default async function InvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: allInvestors } = await supabase
    .from("investors")
    .select(`
      *,
      positions:investor_positions(amount)
    `)
    .order("created_at", { ascending: false });

  const search = sp.q?.trim().toLowerCase();
  const investors = search
    ? (allInvestors || []).filter((i) => {
        const name = (
          i.investor_type === "entity" ? i.entity_name : i.full_name
        ) || "";
        return (
          name.toLowerCase().includes(search) ||
          (i.email?.toLowerCase() || "").includes(search)
        );
      })
    : allInvestors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investors</h1>
        <Button
          nativeButton={false}
          render={<Link href="/admin/investors/new" />}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Investor
        </Button>
      </div>

      <ListSearch placeholder="Search by name or email..." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Deployed</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!investors?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No investors yet.{" "}
                  <Link href="/admin/investors/new" className="underline">
                    Add the first one.
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              investors.map((inv) => {
                const deployed = (inv.positions || []).reduce(
                  (s: number, p: { amount: number }) => s + Number(p.amount),
                  0
                );
                const name =
                  inv.investor_type === "entity"
                    ? inv.entity_name
                    : inv.full_name;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/admin/investors/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {inv.investor_type === "entity"
                          ? "Entity"
                          : "Individual"}
                      </Badge>
                    </TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.committed_capital)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(deployed)}
                    </TableCell>
                    <TableCell>{formatDate(inv.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
