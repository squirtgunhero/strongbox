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
import { Briefcase, Plus } from "lucide-react";
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
        {!investors?.length && !search ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-[14px] font-medium">No investors yet</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground text-center max-w-[300px]">
              Add your first investor to start tracking commitments and deployments.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              nativeButton={false}
              render={<Link href="/admin/investors/new" />}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Investor
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Deployed</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!investors?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No investors match your search.
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
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {inv.investor_type === "entity"
                            ? "Entity"
                            : "Individual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{inv.email}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(inv.committed_capital)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">
                        {formatCurrency(deployed)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(inv.created_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
