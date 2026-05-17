import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { PrintBar } from "../../../print-bar";
import "../../../document.css";

/**
 * Year-end summary of distributions paid to an investor.
 * Not an IRS form 1099-INT itself — this is a summary your accountant uses
 * to file the actual form. URL: ?year=2025
 */
export default async function Investor1099Page({
  params,
  searchParams,
}: {
  params: Promise<{ investorId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { investorId } = await params;
  const sp = await searchParams;
  const year = parseInt(sp.year || `${new Date().getFullYear() - 1}`);
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

  // Get the org name for the payer line
  const { data: org } = await supabase
    .from("org_settings")
    .select("org_name")
    .single();

  const { data: investor } = await supabase
    .from("investors")
    .select(`
      *,
      distributions:investor_distributions(amount, distribution_date)
    `)
    .eq("id", investorId)
    .single();

  if (!investor) notFound();

  // Auth: borrower-like access guard — only staff or the investor themselves
  if (!isStaff && investor.user_id !== user.id) {
    redirect("/portal");
  }

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const dists = (investor.distributions || []).filter(
    (d: { distribution_date: string }) =>
      d.distribution_date >= startOfYear && d.distribution_date <= endOfYear
  );

  const totalInterest = dists.reduce(
    (s: number, d: { amount: number }) => s + Number(d.amount),
    0
  );

  // Group by month for the breakdown table
  const monthlyTotals = new Map<string, number>();
  for (const d of dists) {
    const month = (d as { distribution_date: string }).distribution_date.slice(0, 7);
    monthlyTotals.set(
      month,
      (monthlyTotals.get(month) || 0) + Number((d as { amount: number }).amount)
    );
  }
  const monthly = Array.from(monthlyTotals.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const name =
    investor.investor_type === "entity"
      ? investor.entity_name
      : investor.full_name;

  const backHref = isStaff
    ? `/admin/investors/${investor.id}`
    : "/investor";

  return (
    <>
      <PrintBar backHref={backHref} />
      <div className="doc-page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1 className="doc-h1">
              {year} Year-End Distribution Summary
            </h1>
            <p style={{ color: "#555", fontSize: "0.875rem" }}>
              For Form 1099-INT preparation
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.875rem", color: "#555" }}>
            <div>{new Date().toLocaleDateString("en-US")}</div>
          </div>
        </div>

        <h2 className="doc-h2">Payer</h2>
        <p style={{ fontSize: "0.875rem" }}>
          <strong>{org?.org_name || "StrongBox Lender"}</strong>
        </p>

        <h2 className="doc-h2">Recipient</h2>
        <div className="doc-grid">
          <Row label="Name" value={name} />
          <Row
            label="Type"
            value={investor.investor_type === "entity" ? "Entity" : "Individual"}
          />
          <Row label="Email" value={investor.email} />
          {investor.phone && <Row label="Phone" value={investor.phone} />}
        </div>

        <h2 className="doc-h2">Box 1 — Interest Income</h2>
        <div className="doc-total" style={{ marginTop: "0.5rem" }}>
          <span>Total Interest Distributions {year}</span>
          <span>{formatCurrency(totalInterest)}</span>
        </div>

        {monthly.length > 0 && (
          <>
            <h2 className="doc-h2">Monthly Breakdown</h2>
            <div style={{ marginTop: "0.5rem" }}>
              {monthly.map((m) => (
                <div key={m.month} className="doc-row">
                  <span className="doc-row-label">{m.month}</span>
                  <span className="doc-row-value">
                    {formatCurrency(m.total)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="doc-fine-print">
          This summary is provided for your records and your accountant&apos;s use
          in preparing IRS Form 1099-INT. It is not a substitute for the official
          Form 1099-INT, which is issued separately by {org?.org_name || "the payer"}.
          Distributions reflected here represent interest income only; principal
          returns (if any) are reported separately.
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
