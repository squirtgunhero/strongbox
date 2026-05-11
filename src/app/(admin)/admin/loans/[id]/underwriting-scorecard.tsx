import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluateLoan } from "@/lib/policy";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScorecardProps {
  loan: {
    loan_amount: number;
    interest_rate: number;
    property: {
      as_is_value: number | null;
      after_repair_value: number | null;
      purchase_price: number | null;
      rehab_budget: number | null;
    } | null;
    loan_borrowers?: {
      is_primary: boolean;
      borrower: { deals_completed: number };
    }[];
  };
}

export function UnderwritingScorecard({ loan }: ScorecardProps) {
  const primary = loan.loan_borrowers?.find((lb) => lb.is_primary);

  const flags = evaluateLoan({
    loan_amount: loan.loan_amount,
    interest_rate: loan.interest_rate,
    property: loan.property,
    primary_borrower: primary?.borrower,
  });

  const fails = flags.filter((f) => f.status === "fail").length;
  const warns = flags.filter((f) => f.status === "warn").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Underwriting Scorecard</span>
          <span className="flex items-center gap-3 text-xs font-normal">
            {fails > 0 && (
              <span className="text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {fails} fail{fails === 1 ? "" : "s"}
              </span>
            )}
            {warns > 0 && (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {warns} warn{warns === 1 ? "" : "s"}
              </span>
            )}
            {fails === 0 && warns === 0 && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                All checks pass
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {flags.map((flag) => {
          const Icon =
            flag.status === "pass"
              ? CheckCircle2
              : flag.status === "warn"
                ? AlertCircle
                : XCircle;
          return (
            <div
              key={flag.rule}
              className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0"
            >
              <Icon
                className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  flag.status === "pass" && "text-green-600",
                  flag.status === "warn" && "text-yellow-600",
                  flag.status === "fail" && "text-destructive"
                )}
              />
              <div className="flex-1 flex items-baseline justify-between gap-3">
                <span className="font-medium">{flag.rule}</span>
                <span
                  className={cn(
                    "text-xs text-right",
                    flag.status === "fail" && "text-destructive font-medium"
                  )}
                >
                  {flag.message}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
