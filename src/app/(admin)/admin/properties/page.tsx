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

export default async function PropertiesPage() {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Properties</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">As-Is Value</TableHead>
              <TableHead className="text-right">ARV</TableHead>
              <TableHead className="text-right">Rehab Budget</TableHead>
              <TableHead>Created</TableHead>
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
