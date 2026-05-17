import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOrgAdminClient } from "@/lib/supabase/admin";
import { getCaller } from "@/lib/auth/require-staff";
import { decryptFieldSafe } from "@/lib/crypto";
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
import {
  formatCurrency,
  formatRate,
  formatDate,
  borrowerDisplayName,
  propertyAddress,
} from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { LinkBorrowerCard } from "./link-borrower-card";
import { BorrowerEditForm } from "./borrower-edit-form";

export default async function BorrowerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: borrower } = await supabase
    .from("borrowers")
    .select(`
      *,
      profile:profiles(full_name, email),
      loan_borrowers(
        is_primary,
        loan:loans(
          id, status, loan_amount, interest_rate, maturity_date, current_principal,
          property:properties(address_street, address_city, address_state, address_zip)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!borrower) notFound();

  // Encrypted PII columns are gated to service_role; fetch separately and
  // surface only the last-four to the client. The reveal action audit-logs
  // access of the full value.
  const caller = await getCaller();
  const admin = createOrgAdminClient(caller.orgId);
  let ssnLastFour: string | null = null;
  let einLastFour: string | null = null;
  if (admin) {
    const { data: pii } = await admin
      .from("borrowers")
      .select("ssn_encrypted, ein_encrypted")
      .eq("id", id)
      .single();
    if (pii) {
      const ssn = await decryptFieldSafe(pii.ssn_encrypted);
      const ein = await decryptFieldSafe(pii.ein_encrypted);
      ssnLastFour = ssn ? ssn.replace(/\D/g, "").slice(-4) || null : null;
      einLastFour = ein ? ein.replace(/\D/g, "").slice(-4) || null : null;
    }
  }

  const displayName = borrowerDisplayName(borrower);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">
            {borrower.borrower_type === "entity" ? "Entity" : "Individual"}
          </Badge>
          {borrower.email && <span>{borrower.email}</span>}
          {borrower.phone && <span>· {borrower.phone}</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <BorrowerEditForm
                borrower={borrower}
                ssn_last_four={ssnLastFour}
                ein_last_four={einLastFour}
              />
            </CardContent>
          </Card>
        </div>

        <LinkBorrowerCard
          borrowerId={borrower.id}
          currentUserId={borrower.user_id}
          linkedProfile={borrower.profile}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {!borrower.loan_borrowers?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No loans yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Loan</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Maturity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrower.loan_borrowers.map(
                  (
                    lb: {
                      is_primary: boolean;
                      loan: {
                        id: string;
                        status: string;
                        loan_amount: number;
                        current_principal: number;
                        interest_rate: number;
                        maturity_date: string | null;
                        property: {
                          address_street: string;
                          address_city: string;
                          address_state: string;
                          address_zip: string;
                        } | null;
                      };
                    },
                    idx: number
                  ) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {lb.loan.property ? (
                          <Link
                            href={`/admin/loans/${lb.loan.id}`}
                            className="font-medium hover:underline"
                          >
                            {propertyAddress(lb.loan.property)}
                          </Link>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {LOAN_STATUS_LABELS[lb.loan.status as LoanStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(lb.loan.loan_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(lb.loan.current_principal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRate(lb.loan.interest_rate)}
                      </TableCell>
                      <TableCell>{formatDate(lb.loan.maturity_date)}</TableCell>
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

