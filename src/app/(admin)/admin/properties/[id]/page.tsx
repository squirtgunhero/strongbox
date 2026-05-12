import Link from "next/link";
import { notFound } from "next/navigation";
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
import { formatCurrency, formatRate, propertyAddress } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { PropertyEditForm } from "./property-edit-form";
import { PropertyDocuments } from "./property-documents";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: property }, { data: documents }] = await Promise.all([
    supabase
      .from("properties")
      .select(`
        *,
        loans:loans(id, status, loan_amount, current_principal, interest_rate)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("property_documents")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{propertyAddress(property)}</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {property.property_type.replace(/_/g, " ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyEditForm property={property} />
        </CardContent>
      </Card>

      <PropertyDocuments propertyId={property.id} documents={documents || []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {!property.loans?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No loans on this property.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.loans.map(
                  (l: {
                    id: string;
                    status: string;
                    loan_amount: number;
                    current_principal: number;
                    interest_rate: number;
                  }) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link
                          href={`/admin/loans/${l.id}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {l.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {LOAN_STATUS_LABELS[l.status as LoanStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(l.loan_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(l.current_principal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRate(l.interest_rate)}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
