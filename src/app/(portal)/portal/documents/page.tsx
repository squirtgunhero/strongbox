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
import { formatDate, propertyAddress } from "@/lib/format";
import { DownloadButton } from "./download-button";

const CATEGORY_LABELS: Record<string, string> = {
  application: "Application",
  term_sheet: "Term Sheet",
  promissory_note: "Promissory Note",
  deed_of_trust: "Deed of Trust",
  personal_guarantee: "Personal Guarantee",
  title_commitment: "Title Commitment",
  hazard_insurance: "Hazard Insurance",
  appraisal: "Appraisal",
  bpo: "BPO",
  rehab_budget: "Rehab Budget",
  payoff_letter: "Payoff Letter",
  entity_docs: "Entity Docs",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  other: "Other",
};

export default async function PortalDocuments() {
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("loan_documents")
    .select(`
      *,
      loan:loans(property:properties(address_street, address_city, address_state, address_zip))
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-[21px] font-semibold tracking-[-0.02em]">Documents</h1>

      <Card className="rounded-3xl shadow-[var(--shadow-card)]">
        <CardHeader className="px-6 py-5">
          <CardTitle className="text-[13.5px]">All Documents</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {!docs?.length ? (
            <p className="py-4 text-[13.5px] text-center text-muted-foreground">
              No documents available yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.filename}</TableCell>
                    <TableCell>{CATEGORY_LABELS[d.category] || d.category}</TableCell>
                    <TableCell>
                      {d.loan?.property ? (
                        <Link
                          href={`/portal/loans/${d.loan_id}`}
                          className="hover:underline text-sm"
                        >
                          {propertyAddress(d.loan.property)}
                        </Link>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                    <TableCell>{formatDate(d.created_at)}</TableCell>
                    <TableCell>
                      <DownloadButton storagePath={d.storage_path} />
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
