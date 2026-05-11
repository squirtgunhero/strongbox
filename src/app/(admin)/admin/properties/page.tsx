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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Properties</h1>
      <PropertiesFilter states={states} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <SortableTH field="as_is_value" align="right">As-Is Value</SortableTH>
              <SortableTH field="after_repair_value" align="right">ARV</SortableTH>
              <SortableTH field="rehab_budget" align="right">Rehab Budget</SortableTH>
              <SortableTH field="created_at">Created</SortableTH>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!properties?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No properties yet. They are created when you create a loan.
                </TableCell>
              </TableRow>
            ) : (
              properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="hover:underline"
                    >
                      {propertyAddress(p)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PROPERTY_TYPE_LABELS[p.property_type as PropertyType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.as_is_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.after_repair_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.rehab_budget)}
                  </TableCell>
                  <TableCell>{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
