import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  propertyAddress,
  borrowerDisplayName,
} from "@/lib/format";
import { dailyInterest, accruedInterest } from "@/lib/calculations/interest";
import { PrintBar } from "../../print-bar";
import "../../document.css";

/**
 * Monthly interest-only statement.
 * URL params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Defaults: previous calendar month
 */
export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ loanId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
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

  // Default period = previous calendar month
  const now = new Date();
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const toIso = (d: Date) => d.toISOString().split("T")[0];

  const periodStart = sp.from || toIso(defaultStart);
  const periodEnd = sp.to || toIso(defaultEnd);

  const interestForPeriod = accruedInterest(
    Number(loan.current_principal),
    Number(loan.interest_rate),
    loan.day_count,
    periodStart,
    periodEnd
  );

  const perDiem = dailyInterest(
    Number(loan.current_principal),
    Number(loan.interest_rate),
    loan.day_count
  );

  const primary = loan.loan_borrowers?.find(
    (lb: { is_primary: boolean }) => lb.is_primary
  );

  // Due date = period_end + 1
  const dueDate = new Date(periodEnd + "T00:00:00Z");
  dueDate.setUTCDate(dueDate.getUTCDate() + 1);

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
            <h1 className="doc-h1">Monthly Statement</h1>
            <p style={{ color: "#555", fontSize: "0.875rem" }}>
              {formatDate(periodStart)} – {formatDate(periodEnd)}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.875rem", color: "#555" }}>
            <div>Issued: {today}</div>
            <div>Loan #{loan.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <h2 className="doc-h2">Borrower</h2>
        {primary?.borrower && (
          <p style={{ fontSize: "0.875rem" }}>
            {borrowerDisplayName(primary.borrower)}
            {primary.borrower.email && (
              <span style={{ color: "#555" }}> · {primary.borrower.email}</span>
            )}
          </p>
        )}

        {loan.property && (
          <>
            <h2 className="doc-h2">Property</h2>
            <p style={{ fontSize: "0.875rem" }}>{propertyAddress(loan.property)}</p>
          </>
        )}

        <h2 className="doc-h2">This Period</h2>
        <div className="doc-grid">
          <Row label="Principal Balance" value={formatCurrency(loan.current_principal)} />
          <Row
            label="Interest Rate"
            value={`${(Number(loan.interest_rate) * 100).toFixed(2)}%`}
          />
          <Row
            label="Day Count"
            value={loan.day_count === "actual_360" ? "Actual/360" : "Actual/365"}
          />
          <Row label="Per Diem" value={formatCurrency(perDiem)} />
        </div>

        <div className="doc-total">
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "#555" }}>
              Amount Due
            </div>
            <div>Interest for period</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "#555" }}>
              Due {formatDate(toIso(dueDate))}
            </div>
            <div>{formatCurrency(interestForPeriod)}</div>
          </div>
        </div>

        <p className="doc-fine-print">
          Payment is due on or before the date listed. Late fees may apply to payments received
          after the grace period as defined in your note. Principal balance is amortized only
          when principal payments are made; this is an interest-only loan unless otherwise stated.
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
