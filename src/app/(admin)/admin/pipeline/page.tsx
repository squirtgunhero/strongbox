import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatRate, borrowerDisplayName } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";

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
      *,
      property:properties(address_street, address_city, address_state),
      loan_borrowers(is_primary, borrower:borrowers(*))
    `)
    .in("status", PIPELINE_STAGES)
    .order("updated_at", { ascending: false });

  const byStage: Record<LoanStatus, typeof loans> = {} as never;
  PIPELINE_STAGES.forEach((s) => {
    byStage[s] = (loans || []).filter((l) => l.status === s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Loans by stage from lead through funded
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4 min-w-0">
        {PIPELINE_STAGES.map((stage) => {
          const stageLoans = byStage[stage] || [];
          const total = stageLoans.reduce(
            (sum, l) => sum + Number(l.loan_amount),
            0
          );
          return (
            <div key={stage} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">
                  {LOAN_STATUS_LABELS[stage]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {stageLoans.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {formatCurrency(total)}
              </p>
              <div className="flex flex-col gap-2">
                {stageLoans.length === 0 ? (
                  <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  stageLoans.map((loan) => {
                    const primary = loan.loan_borrowers?.find(
                      (lb: { is_primary: boolean }) => lb.is_primary
                    );
                    const borrowerName = primary?.borrower
                      ? borrowerDisplayName(primary.borrower)
                      : "Unknown";
                    const address = loan.property
                      ? `${loan.property.address_street}, ${loan.property.address_city}`
                      : "No property";
                    const daysInStage = Math.floor(
                      (Date.now() - new Date(loan.updated_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <Link
                        key={loan.id}
                        href={`/admin/loans/${loan.id}`}
                        className="block"
                      >
                        <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer space-y-1.5">
                          <div className="text-sm font-medium truncate">
                            {address}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {borrowerName}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">
                              {formatCurrency(loan.loan_amount)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatRate(loan.interest_rate)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {daysInStage === 0
                              ? "today"
                              : `${daysInStage}d in stage`}
                          </div>
                        </Card>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
