import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  borrowerDisplayName,
  propertyAddress,
} from "@/lib/format";
import { PrintBar } from "../../print-bar";
import "../../document.css";

export default async function BusinessPurposeAffidavitPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const { loanId } = await params;
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
        <h1 className="doc-h1" style={{ textAlign: "center" }}>
          Business-Purpose Affidavit
        </h1>
        <p style={{ textAlign: "center", color: "#555", fontSize: "0.875rem" }}>
          For Loan #{loan.id.slice(0, 8).toUpperCase()}
        </p>

        <p style={{ marginTop: "2rem" }}>
          I, {primary?.borrower ? <strong>{borrowerDisplayName(primary.borrower)}</strong> : "____________________"},
          being duly sworn, depose and state under penalty of perjury:
        </p>

        <ol style={{ paddingLeft: "1.5rem", lineHeight: 1.7, marginTop: "1rem" }}>
          <li>
            I am the borrower (or an authorized signer of the borrower entity)
            named in the loan documents being executed in connection with this
            transaction.
          </li>
          <li>
            The proceeds of this loan will be used <strong>primarily for business,
            commercial, or investment purposes</strong> and will not be used for
            personal, family, or household purposes.
          </li>
          <li>
            The property securing this loan, located at{" "}
            {loan.property ? (
              <strong>{propertyAddress(loan.property)}</strong>
            ) : (
              "____________________"
            )}
            , is not now and will not be occupied by me or my immediate family
            as a primary residence.
          </li>
          <li>
            I understand that this loan is exempt from the Truth in Lending Act
            (TILA), the Real Estate Settlement Procedures Act (RESPA), and other
            consumer-protection statutes that apply only to consumer-purpose
            credit transactions, and that the lender is relying on this
            certification in making the loan.
          </li>
          <li>
            I make this affidavit knowing that the lender will rely upon it in
            extending credit and that any false statement herein may be the
            basis for civil and criminal penalties, including loan acceleration.
          </li>
        </ol>

        <div className="doc-signature" style={{ marginTop: "4rem" }}>
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
            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
              {today}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "3rem" }}>
          <div className="doc-signature-line">
            Notary / Witness (if required by state)
          </div>
        </div>
      </div>
    </>
  );
}
