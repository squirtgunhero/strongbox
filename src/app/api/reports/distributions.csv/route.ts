import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/calculations/reports";

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

  const { data: distributions } = await supabase
    .from("investor_distributions")
    .select(`
      id, amount, distribution_date, payment_id, loan_id,
      investor:investors(full_name, entity_name, investor_type, email)
    `)
    .order("distribution_date", { ascending: false });

  type Row = {
    id: string;
    amount: number;
    distribution_date: string;
    payment_id: string | null;
    loan_id: string;
    investor: {
      full_name: string | null;
      entity_name: string | null;
      investor_type: string;
      email: string;
    } | null;
  };

  const rows = ((distributions || []) as unknown as Row[]).map((d) => ({
    distribution_id: d.id,
    distribution_date: d.distribution_date,
    amount: d.amount,
    investor_name:
      d.investor?.investor_type === "entity"
        ? d.investor.entity_name
        : d.investor?.full_name,
    investor_email: d.investor?.email || "",
    loan_id: d.loan_id,
    payment_id: d.payment_id || "",
  }));

  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="distributions-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
