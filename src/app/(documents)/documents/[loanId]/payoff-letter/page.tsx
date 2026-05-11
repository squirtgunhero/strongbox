import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  propertyAddress,
  borrowerDisplayName,
} from "@/lib/format";
import { calculatePayoff } from "@/lib/calculations/payoff";
import { PrintBar } from "../../print-bar";
import "../../document.css";

export default async function PayoffLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ loanId: string }>;
  searchParams: Promise<{ payoffDate?: string; paidThrough?: string }>;
}) {
  const { loanId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff =
    profile && ["admin", "loan_officer"].includes(profile.role);

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

  // Find last paid-through date
  const { data: payments } = await supabase
    .from("payments")
    .select("received_date, due_date, applied_to_interest")
    .eq("loan_id", loanId)
    .gt("applied_to_interest", 0)
    .order("received_date", { ascending: false })
    .limit(1);

  const lastPaid = payments?.[0];
  const paidThroughDate =
    sp.paidThrough ||
    lastPaid?.received_date ||
    lastPaid?.due_date ||
    loan.funded_date ||
    new Date().toISOString().split("T")[0];

  const payoffDate =
    sp.payoffDate || new Date().toISOString().split("T")[0];

  const payoff = calculatePayoff({
    currentPrincipal: Number(loan.current_principal),
    interestRate: Number(loan.interest_rate),
    defaultRate: loan.default_rate ? Number(loan.default_rate) : null,
    dayCount: loan.day_count,
    paidThroughDate,
    payoffDate,
    outstandingLateFees: 0,
    isDefaulted: loan.is_defaulted,
  });

  const primary = loan.loan_borrowers?.find(
    (lb: { is_primary: boolean }) => lb.is_primary
  );

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const backHref = isStaff
    ? `/admin/loans/${loan.id}`
    : `/portal/loans/${loan.id}`;

  return (
    <>
      <PrintBar backHref={backHref} />
      <div className="doc-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="doc-h1">Payoff Statement</h1>
            <p style={{ color: "#555", fontSize: "0.875rem" }}>
              Loan #{loan.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.875rem", color: "#555" }}>
            <div>Issued: {today}</div>
            <div>Good through: {formatDate(payoffDate)}</div>
          </div>
        </div>

        <h2 className="doc-h2">Borrower</h2>
        {primary?.borrower && (
          <div className="doc-grid">
            <Row label="Name" value={borrowerDisplayName(primary.borrower)} />
            {primary.borrower.email && <Row label="Email" value={primary.borrower.email} />}
          </div>
        )}

        {loan.property && (
          <>
            <h2 className="doc-h2">Secured by</h2>
            <p style={{ fontSize: "0.875rem" }}>{propertyAddress(loan.property)}</p>
          </>
        )}

        <h2 className="doc-h2">Payoff Breakdown</h2>
        <div style={{ marginTop: "0.5rem" }}>
          <div className="doc-row">
            <span className="doc-row-label">Principal Balance</span>
            <span className="doc-row-value">{formatCurrency(payoff.principal)}</span>
          </div>
          <div className="doc-row">
            <span className="doc-row-label">
              Accrued Interest ({payoff.daysAccrued} days @ {formatCurrency(payoff.perDiem)}/day)
            </span>
            <span className="doc-row-value">{formatCurrency(payoff.accruedInterest)}</span>
          </div>
          {payoff.lateFees > 0 && (
            <div className="doc-row">
              <span className="doc-row-label">Outstanding Late Fees</span>
              <span className="doc-row-value">{formatCurrency(payoff.lateFees)}</span>
            </div>
          )}
          {payoff.extensionFees > 0 && (
            <div className="doc-row">
              <span className="doc-row-label">Extension Fees</span>
              <span className="doc-row-value">{formatCurrency(payoff.extensionFees)}</span>
            </div>
          )}
          <div className="doc-total">
            <span>Total Payoff Amount</span>
            <span>{formatCurrency(payoff.total)}</span>
          </div>
        </div>

        <h2 className="doc-h2">Per Diem Interest</h2>
        <p style={{ fontSize: "0.875rem" }}>
          After {formatDate(payoffDate)}, interest accrues at{" "}
          <strong>{formatCurrency(payoff.perDiem)} per day</strong>. Add this amount per day for
          payoffs received after the date above.
        </p>

        <p className="doc-fine-print">
          This payoff statement is calculated as of the date above. Funds must be received via
          wire by the close of business on {formatDate(payoffDate)} for this amount to be valid.
          Subsequent business days will require an updated statement reflecting additional
          accrued interest. This statement is not a release; release of lien is issued upon
          receipt of cleared funds.
        </p>
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
