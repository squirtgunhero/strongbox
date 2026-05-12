import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "./pipeline-board";
import type { LoanStatus } from "@/lib/types";

const PIPELINE_STAGES: LoanStatus[] = [
  "lead",
  "application",
  "underwriting",
  "approved",
  "funded",
];

export default async function PipelinePage() {
  const supabase = await createClient();

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, status, loan_amount, interest_rate, updated_at,
      property:properties(address_street, address_city),
      loan_borrowers(is_primary, borrower:borrowers(*))
    `)
    .in("status", PIPELINE_STAGES)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sb-h1">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {(loans || []).length} deals · drag to move between stages
        </p>
      </div>
      <PipelineBoard initialLoans={(loans || []) as never} />
    </div>
  );
}
