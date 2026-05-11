import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/calculations/reports";
import { borrowerDisplayName } from "@/lib/format";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "loan_officer"].includes(profile.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id,
      status,
      loan_amount,
      current_principal,
      interest_rate,
      points,
      term_months,
      funded_date,
      maturity_date,
      is_business_purpose,
      is_defaulted,
      property:properties(address_street, address_city, address_state, address_zip),
      loan_borrowers(is_primary, borrower:borrowers(*))
    `);

  // Supabase typegen treats single-object relations as arrays; cast to a loose shape.
  type Row = {
    id: string;
    status: string;
    loan_amount: number;
    current_principal: number;
    interest_rate: number;
    points: number | null;
    term_months: number;
    funded_date: string | null;
    maturity_date: string | null;
    is_business_purpose: boolean;
    is_defaulted: boolean;
    property: {
      address_street: string;
      address_city: string;
      address_state: string;
      address_zip: string;
    } | null;
    loan_borrowers?: {
      is_primary: boolean;
      borrower: {
        borrower_type: string;
        first_name: string | null;
        last_name: string | null;
        entity_name: string | null;
      };
    }[];
  };

  const rows = ((loans || []) as unknown as Row[]).map(
    (l) => {
      const primary = l.loan_borrowers?.find((lb) => lb.is_primary);
      return {
        loan_id: l.id,
        status: l.status,
        borrower: primary?.borrower ? borrowerDisplayName(primary.borrower) : "",
        property_street: l.property?.address_street || "",
        property_city: l.property?.address_city || "",
        property_state: l.property?.address_state || "",
        property_zip: l.property?.address_zip || "",
        loan_amount: l.loan_amount,
        current_principal: l.current_principal,
        interest_rate: l.interest_rate,
        points: l.points || "",
        term_months: l.term_months,
        funded_date: l.funded_date || "",
        maturity_date: l.maturity_date || "",
        is_business_purpose: l.is_business_purpose,
        is_defaulted: l.is_defaulted,
      };
    }
  );

  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loans-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
