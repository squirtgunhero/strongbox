import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, propertyAddress } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/lib/types";
import { PropertiesFilter } from "./properties-filter";
import { SortableTH } from "@/components/sortable-th";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const SORTABLE_FIELDS = [
    "created_at",
    "as_is_value",
    "after_repair_value",
    "rehab_budget",
    "address_state",
  ];
  const dbSort = SORTABLE_FIELDS.includes(sp.sort || "")
    ? sp.sort!
    : "created_at";
  const ascending = sp.dir === "asc";

  const { data: allProperties } = await supabase
    .from("properties")
    .select("*")
    .order(dbSort, { ascending, nullsFirst: false });

  const search = sp.q?.trim().toLowerCase();
  const stateFilter = sp.state?.toUpperCase();
  let properties = allProperties || [];
  if (search) {
    properties = properties.filter((p) =>
      propertyAddress(p).toLowerCase().includes(search)
    );
  }
  if (stateFilter && stateFilter !== "ALL") {
    properties = properties.filter((p) => p.address_state === stateFilter);
  }

  // Distinct states for the filter dropdown
  const states = Array.from(
    new Set((allProperties || []).map((p) => p.address_state).filter(Boolean))
  ).sort();

  // Pagination
  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const total = properties.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageProperties = properties.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function pageHref(p: number) {
    const next = new URLSearchParams();
    if (sp.q) next.set("q", sp.q);
    if (sp.state) next.set("state", sp.state);
    if (sp.sort) next.set("sort", sp.sort);
    if (sp.dir) next.set("dir", sp.dir);
    next.set("page", String(p));
    return `/admin/properties?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Properties</h1>
      <PropertiesFilter states={states} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <SortableTH field="as_is_value" align="right">As-Is Value</SortableTH>
              <SortableTH field="after_repair_value" align="right" className="hidden md:table-cell">ARV</SortableTH>
              <SortableTH field="rehab_budget" align="right" className="hidden md:table-cell">Rehab Budget</SortableTH>
              <SortableTH field="created_at" className="hidden sm:table-cell">Created</SortableTH>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!pageProperties?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No properties match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageProperties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="hover:underline"
                    >
                      {propertyAddress(p)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">
                      {PROPERTY_TYPE_LABELS[p.property_type as PropertyType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.as_is_value)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {formatCurrency(p.after_repair_value)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {formatCurrency(p.rehab_budget)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} propert{total === 1 ? "y" : "ies"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="hover:underline">
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="hover:underline">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
