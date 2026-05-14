import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  formatRate,
  formatDate,
  propertyAddress,
  borrowerDisplayName,
} from "@/lib/format";
import {
  LOAN_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  LOAN_PURPOSE_LABELS,
  EXIT_STRATEGY_LABELS,
  type LoanStatus,
  type PropertyType,
  type LoanPurpose,
  type ExitStrategy,
} from "@/lib/types";
import { LoanStatusControls } from "./loan-status-controls";
import { PaymentsList } from "./payments-list";
import { RecordPayment } from "./record-payment";
import { UnderwritingScorecard } from "./underwriting-scorecard";
import { NotesThread } from "./notes-thread";
import { DocumentsSection } from "./documents-section";
import { PayoffCalculator } from "./payoff-calculator";
import { DrawsSection } from "./draws-section";
import { getDualApprovalThreshold } from "@/lib/org-settings";
import { remainingHoldback } from "@/lib/calculations/holdback";
import { DocumentActionsBar } from "./document-actions-bar";
import { SignaturesSection } from "./signatures-section";
import { InvestorPositions } from "./investor-positions";
import { ConditionsChecklist } from "./conditions-checklist";
import { ExtensionDialog } from "./extension-dialog";
import { AddLateFee } from "./add-late-fee";
import { OfficerSelect } from "./officer-select";
import { StatusTimeline } from "./status-timeline";
import { InsuranceDisplay } from "./insurance-display";
import { PaymentIntentsSection } from "./payment-intents-section";
import { TagsEditor } from "./tags-editor";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: loan } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(*),
      loan_borrowers(
        is_primary,
        borrower:borrowers(*)
      ),
      loan_officer:profiles!loans_loan_officer_id_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (!loan) notFound();

  const [
    { data: payments },
    { data: notes },
    { data: documents },
    { data: draws },
    { data: signatureRequests },
    { data: investorPositions },
    { data: availableInvestors },
    { data: conditions },
    { data: conditionTemplates },
    { data: staff },
    { data: auditEntries },
    { data: paymentIntents },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .eq("loan_id", id)
      .order("due_date", { ascending: false }),
    supabase
      .from("loan_notes")
      .select("*, author:profiles!loan_notes_author_id_fkey(full_name)")
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("loan_documents")
      .select("*, uploaded_by_user:profiles!loan_documents_uploaded_by_fkey(full_name)")
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("draws")
      .select(`
        *,
        approvals:draw_approvals(approver_id, approver:profiles(full_name)),
        line_items:draw_line_items(description, amount)
      `)
      .eq("loan_id", id)
      .order("requested_at", { ascending: false }),
    supabase
      .from("signature_requests")
      .select("*")
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("investor_positions")
      .select(`
        *,
        investor:investors(id, full_name, entity_name, investor_type)
      `)
      .eq("loan_id", id),
    supabase
      .from("investors")
      .select("id, full_name, entity_name, investor_type")
      .order("created_at", { ascending: false }),
    supabase
      .from("loan_conditions")
      .select("*")
      .eq("loan_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("condition_templates")
      .select("id, name")
      .order("is_builtin", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["admin", "loan_officer"])
      .order("full_name", { ascending: true }),
    supabase
      .from("audit_log")
      .select(`
        id, action, old_values, new_values, created_at,
        performer:profiles!audit_log_performed_by_fkey(full_name)
      `)
      .eq("table_name", "loans")
      .eq("record_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("payment_intents")
      .select("*")
      .eq("loan_id", id)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const rehabBudget = Number(loan.property?.rehab_budget) || 0;
  const holdbackLeft = remainingHoldback(rehabBudget, draws || []);

  const primaryBorrower = loan.loan_borrowers?.find(
    (lb: { is_primary: boolean }) => lb.is_primary
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">
            {loan.property
              ? propertyAddress(loan.property)
              : `Loan ${loan.id.slice(0, 8)}`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge>{LOAN_STATUS_LABELS[loan.status as LoanStatus]}</Badge>
            {loan.loan_purpose && (
              <span className="text-sm text-muted-foreground">
                {LOAN_PURPOSE_LABELS[loan.loan_purpose as LoanPurpose]}
              </span>
            )}
          </div>
          <div className="mt-2">
            <TagsEditor loanId={loan.id} initialTags={loan.tags || []} />
          </div>
        </div>
        <LoanStatusControls loanId={loan.id} currentStatus={loan.status} />
      </div>

      <DocumentActionsBar loanId={loan.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Loan Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Loan Amount" value={formatCurrency(loan.loan_amount)} />
            <Row label="Current Principal" value={formatCurrency(loan.current_principal)} />
            <Row label="Interest Rate" value={formatRate(loan.interest_rate)} />
            {loan.default_rate && (
              <Row label="Default Rate" value={formatRate(loan.default_rate)} />
            )}
            <Row label="Points" value={loan.points ? formatRate(loan.points) : "--"} />
            <Row label="Term" value={`${loan.term_months} months`} />
            <Row
              label="Day Count"
              value={loan.day_count === "actual_360" ? "Actual/360" : "Actual/365"}
            />
            {loan.exit_strategy && (
              <Row
                label="Exit Strategy"
                value={EXIT_STRATEGY_LABELS[loan.exit_strategy as ExitStrategy]}
              />
            )}
            <Separator />
            <Row label="Origination" value={formatDate(loan.origination_date)} />
            <Row label="Funded" value={formatDate(loan.funded_date)} />
            <Row label="Maturity" value={formatDate(loan.maturity_date)} />
            {loan.is_defaulted && (
              <Row label="Default Date" value={formatDate(loan.default_date)} />
            )}
            <Row label="Extensions" value={`${loan.extension_count}${loan.max_extensions ? ` / ${loan.max_extensions}` : ""}`} />
            {["active", "funded", "defaulted"].includes(loan.status) && (
              <div className="pt-1">
                <ExtensionDialog
                  loanId={loan.id}
                  loanAmount={Number(loan.loan_amount)}
                  currentMaturity={loan.maturity_date}
                  extensionCount={loan.extension_count}
                  maxExtensions={loan.max_extensions}
                  defaultFeePoints={
                    loan.extension_fee_points
                      ? Number(loan.extension_fee_points)
                      : null
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loan.property ? (
              <>
                <Row label="Address" value={propertyAddress(loan.property)} />
                <Row
                  label="Type"
                  value={PROPERTY_TYPE_LABELS[loan.property.property_type as PropertyType]}
                />
                <Row label="Purchase Price" value={formatCurrency(loan.property.purchase_price)} />
                <Row label="As-Is Value" value={formatCurrency(loan.property.as_is_value)} />
                <Row label="ARV" value={formatCurrency(loan.property.after_repair_value)} />
                <Row label="Rehab Budget" value={formatCurrency(loan.property.rehab_budget)} />
              </>
            ) : (
              <p className="text-muted-foreground">No property linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Borrower</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {primaryBorrower?.borrower ? (
              <>
                <Row
                  label="Name"
                  value={borrowerDisplayName(primaryBorrower.borrower)}
                />
                <Row
                  label="Type"
                  value={
                    primaryBorrower.borrower.borrower_type === "entity"
                      ? "Entity"
                      : "Individual"
                  }
                />
                <Row label="Email" value={primaryBorrower.borrower.email || "--"} />
                <Row label="Phone" value={primaryBorrower.borrower.phone || "--"} />
                <Row
                  label="Deals Completed"
                  value={`${primaryBorrower.borrower.deals_completed}`}
                />
              </>
            ) : (
              <p className="text-muted-foreground">No borrower linked</p>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Loan Officer</span>
              <div className="w-48">
                <OfficerSelect
                  loanId={loan.id}
                  currentOfficerId={loan.loan_officer_id}
                  staff={staff || []}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Underwriting scorecard + payoff calculator */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UnderwritingScorecard loan={loan} />
        {["funded", "active", "defaulted"].includes(loan.status) && (
          <PayoffCalculator
            loan={loan}
            paidThroughDate={
              (payments || []).find((p) => p.applied_to_interest > 0)?.received_date ||
              null
            }
            outstandingLateFees={0}
          />
        )}
      </div>

      {["funded", "active", "defaulted"].includes(loan.status) && (
        <InsuranceDisplay
          insurance={{
            insurance_carrier: loan.insurance_carrier ?? null,
            insurance_policy_number: loan.insurance_policy_number ?? null,
            insurance_coverage_amount: loan.insurance_coverage_amount ?? null,
            insurance_expiration_date: loan.insurance_expiration_date ?? null,
            insurance_agent_name: loan.insurance_agent_name ?? null,
            insurance_agent_email: loan.insurance_agent_email ?? null,
            insurance_agent_phone: loan.insurance_agent_phone ?? null,
            insurance_updated_at: loan.insurance_updated_at ?? null,
          }}
        />
      )}

      {/* Draws (only show if rehab budget is set) */}
      {rehabBudget > 0 && user && (
        <DrawsSection
          loanId={loan.id}
          draws={draws || []}
          rehabBudget={rehabBudget}
          remainingHoldback={holdbackLeft}
          currentUserId={user.id}
          dualApprovalThreshold={await getDualApprovalThreshold(supabase)}
        />
      )}

      {/* Investor positions */}
      <InvestorPositions
        loanId={loan.id}
        loanAmount={Number(loan.loan_amount)}
        positions={(investorPositions || []) as never}
        availableInvestors={availableInvestors || []}
      />

      {/* E-signature requests */}
      <SignaturesSection
        loanId={loan.id}
        requests={signatureRequests || []}
        defaultSigner={{
          id: primaryBorrower?.borrower?.id || null,
          name: primaryBorrower?.borrower
            ? borrowerDisplayName(primaryBorrower.borrower)
            : "",
          email: primaryBorrower?.borrower?.email || "",
        }}
      />

      {/* Conditions + Notes side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ConditionsChecklist
          loanId={loan.id}
          conditions={conditions || []}
          templates={conditionTemplates || []}
        />
        <NotesThread loanId={loan.id} notes={notes || []} />
      </div>

      <DocumentsSection loanId={loan.id} documents={documents || []} />

      <StatusTimeline entries={(auditEntries || []) as never} />

      <PaymentIntentsSection intents={paymentIntents || []} />

      {/* Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payments</CardTitle>
          <div className="flex gap-2">
            <AddLateFee loanId={loan.id} />
            <RecordPayment
              loanId={loan.id}
              openIntents={((paymentIntents || []) as unknown as {
                id: string;
                amount: number;
                method: string;
                sent_date: string;
                reference_number: string | null;
                status: string;
              }[])
                .filter((p) => ["submitted", "verified"].includes(p.status))
                .map((p) => ({
                  id: p.id,
                  amount: Number(p.amount),
                  method: p.method,
                  sent_date: p.sent_date,
                  reference_number: p.reference_number,
                }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          <PaymentsList payments={payments || []} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-destructive" : ""}>
        {value}
      </span>
    </div>
  );
}
