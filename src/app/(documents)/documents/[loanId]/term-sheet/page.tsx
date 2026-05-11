import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatRate,
  formatDate,
  propertyAddress,
  borrowerDisplayName,
} from "@/lib/format";
import { PrintBar } from "../../print-bar";
import "../../document.css";

export default async function TermSheetPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const { loanId } = await params;
  const supabase = await createClient();

  // Only staff should generate term sheets
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user!.id)
    .single();

  if (!profile || !["admin", "loan_officer"].includes(profile.role)) {
    redirect("/login");
  }

  const { data: loan } = await supabase
    .from("loans")
    .select(`
      *,
      property:properties(*),
      loan_borrowers(is_primary, borrower:borrowers(*))
    `)
    .eq("id", loanId)
    .single();

  if (!loan) notFound();

  const primary = loan.loan_borrowers?.find(
    (lb: { is_primary: boolean }) => lb.is_primary
  );
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const pointsAmount = loan.points ? loan.loan_amount * Number(loan.points) : 0;

  return (
    <>
      <PrintBar backHref={`/admin/loans/${loan.id}`} />
      <div className="doc-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="doc-h1">Term Sheet</h1>
            <p style={{ color: "#555", fontSize: "0.875rem" }}>
              Non-Binding Indication of Terms
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.875rem", color: "#555" }}>
            <div>{today}</div>
            <div>Loan #{loan.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <h2 className="doc-h2">Borrower</h2>
        {primary?.borrower ? (
          <div className="doc-grid">
            <Row label="Name" value={borrowerDisplayName(primary.borrower)} />
            <Row
              label="Type"
              value={primary.borrower.borrower_type === "entity" ? "Entity" : "Individual"}
            />
            {primary.borrower.email && <Row label="Email" value={primary.borrower.email} />}
            {primary.borrower.phone && <Row label="Phone" value={primary.borrower.phone} />}
            {primary.borrower.borrower_type === "entity" && primary.borrower.formation_state && (
              <Row label="Formation State" value={primary.borrower.formation_state} />
            )}
          </div>
        ) : (
          <p>No borrower on file.</p>
        )}

        <h2 className="doc-h2">Property</h2>
        {loan.property ? (
          <div className="doc-grid">
            <Row label="Address" value={propertyAddress(loan.property)} />
            <Row label="Type" value={loan.property.property_type.replace("_", " ")} />
            <Row label="Purchase Price" value={formatCurrency(loan.property.purchase_price)} />
            <Row label="As-Is Value" value={formatCurrency(loan.property.as_is_value)} />
            <Row label="After-Repair Value" value={formatCurrency(loan.property.after_repair_value)} />
            <Row label="Rehab Budget" value={formatCurrency(loan.property.rehab_budget)} />
          </div>
        ) : (
          <p>No property on file.</p>
        )}

        <h2 className="doc-h2">Loan Terms</h2>
        <div className="doc-grid">
          <Row label="Loan Amount" value={formatCurrency(loan.loan_amount)} />
          <Row label="Interest Rate" value={formatRate(loan.interest_rate)} />
          <Row
            label="Points"
            value={
              loan.points
                ? `${(Number(loan.points) * 100).toFixed(2)}% (${formatCurrency(pointsAmount)})`
                : "--"
            }
          />
          <Row label="Term" value={`${loan.term_months} months`} />
          <Row
            label="Day Count"
            value={loan.day_count === "actual_360" ? "Actual/360" : "Actual/365"}
          />
          {loan.default_rate && (
            <Row label="Default Rate" value={formatRate(loan.default_rate)} />
          )}
          {loan.exit_strategy && (
            <Row label="Exit Strategy" value={loan.exit_strategy.replace("_", " ")} />
          )}
          {loan.loan_purpose && (
            <Row label="Purpose" value={loan.loan_purpose.replace("_", " ")} />
          )}
        </div>

        <h2 className="doc-h2">Conditions to Close</h2>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.875rem", lineHeight: 1.7 }}>
          <li>Clear title commitment with no material exceptions</li>
          <li>Hazard insurance with lender as mortgagee</li>
          <li>Executed personal guarantee (if entity borrower)</li>
          <li>Final inspection and BPO/appraisal acceptable to lender</li>
          <li>Funding via wire to closing agent</li>
        </ul>

        <p className="doc-fine-print">
          This term sheet is a non-binding indication of terms and is subject to underwriting,
          satisfactory completion of due diligence, and execution of definitive loan documents.
          Rates and terms are subject to change until loan documents are executed and funded.
          This document does not constitute a commitment to lend.
        </p>

        <div className="doc-signature">
          <div>
            <div className="doc-signature-line">Borrower Signature</div>
            {primary?.borrower && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                {borrowerDisplayName(primary.borrower)}
              </div>
            )}
          </div>
          <div>
            <div className="doc-signature-line">Date</div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="doc-row">
      <span className="doc-row-label">{label}</span>
      <span className="doc-row-value">{value ?? "--"}</span>
    </div>
  );
}
