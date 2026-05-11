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

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("received_date", { ascending: false });

  const rows = (payments || []).map(
    (p: {
      id: string;
      loan_id: string;
      payment_type: string;
      amount: number;
      applied_to_late_fees: number;
      applied_to_default_interest: number;
      applied_to_interest: number;
      applied_to_escrow: number;
      applied_to_principal: number;
      due_date: string;
      received_date: string | null;
    }) => ({
      payment_id: p.id,
      loan_id: p.loan_id,
      payment_type: p.payment_type,
      amount: p.amount,
      applied_to_late_fees: p.applied_to_late_fees,
      applied_to_default_interest: p.applied_to_default_interest,
      applied_to_interest: p.applied_to_interest,
      applied_to_escrow: p.applied_to_escrow,
      applied_to_principal: p.applied_to_principal,
      due_date: p.due_date,
      received_date: p.received_date || "",
    })
  );

  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
