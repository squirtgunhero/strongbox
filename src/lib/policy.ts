// Underwriting policy thresholds.
// These should be configurable per-tenant eventually; hardcoded defaults for now.

export const POLICY = {
  MAX_LTARV: 0.75,
  MAX_LTV: 0.7,
  MAX_LTC: 0.85,
  MIN_BORROWER_EXPERIENCE: 1, // min prior deals
  MAX_RATE: 0.18,
  MIN_RATE: 0.08,
};

export type PolicyFlag = {
  rule: string;
  status: "pass" | "warn" | "fail";
  message: string;
  value?: string;
};

export function evaluateLoan(loan: {
  loan_amount: number;
  interest_rate: number;
  property?: {
    as_is_value: number | null;
    after_repair_value: number | null;
    purchase_price: number | null;
    rehab_budget: number | null;
  } | null;
  primary_borrower?: {
    deals_completed: number;
  } | null;
}): PolicyFlag[] {
  const flags: PolicyFlag[] = [];
  const prop = loan.property;

  // LTV
  if (prop?.as_is_value) {
    const ltv = loan.loan_amount / prop.as_is_value;
    flags.push({
      rule: "LTV",
      status: ltv > POLICY.MAX_LTV ? "fail" : ltv > POLICY.MAX_LTV - 0.05 ? "warn" : "pass",
      message: `${(ltv * 100).toFixed(1)}% (max ${(POLICY.MAX_LTV * 100).toFixed(0)}%)`,
      value: `${(ltv * 100).toFixed(1)}%`,
    });
  } else {
    flags.push({
      rule: "LTV",
      status: "warn",
      message: "As-is value not entered",
    });
  }

  // LTC
  if (prop?.purchase_price) {
    const totalCost = prop.purchase_price + (prop.rehab_budget || 0);
    const ltc = loan.loan_amount / totalCost;
    flags.push({
      rule: "LTC",
      status: ltc > POLICY.MAX_LTC ? "fail" : ltc > POLICY.MAX_LTC - 0.05 ? "warn" : "pass",
      message: `${(ltc * 100).toFixed(1)}% (max ${(POLICY.MAX_LTC * 100).toFixed(0)}%)`,
      value: `${(ltc * 100).toFixed(1)}%`,
    });
  } else {
    flags.push({
      rule: "LTC",
      status: "warn",
      message: "Purchase price not entered",
    });
  }

  // LTARV
  if (prop?.after_repair_value) {
    const ltarv = loan.loan_amount / prop.after_repair_value;
    flags.push({
      rule: "LTARV",
      status: ltarv > POLICY.MAX_LTARV ? "fail" : ltarv > POLICY.MAX_LTARV - 0.05 ? "warn" : "pass",
      message: `${(ltarv * 100).toFixed(1)}% (max ${(POLICY.MAX_LTARV * 100).toFixed(0)}%)`,
      value: `${(ltarv * 100).toFixed(1)}%`,
    });
  } else {
    flags.push({
      rule: "LTARV",
      status: "warn",
      message: "ARV not entered",
    });
  }

  // Rate
  if (loan.interest_rate < POLICY.MIN_RATE || loan.interest_rate > POLICY.MAX_RATE) {
    flags.push({
      rule: "Rate",
      status: "warn",
      message: `${(loan.interest_rate * 100).toFixed(2)}% outside typical range ${(POLICY.MIN_RATE * 100).toFixed(0)}-${(POLICY.MAX_RATE * 100).toFixed(0)}%`,
    });
  } else {
    flags.push({
      rule: "Rate",
      status: "pass",
      message: `${(loan.interest_rate * 100).toFixed(2)}%`,
    });
  }

  // Borrower experience
  if (loan.primary_borrower) {
    const exp = loan.primary_borrower.deals_completed;
    flags.push({
      rule: "Experience",
      status: exp >= POLICY.MIN_BORROWER_EXPERIENCE ? "pass" : "warn",
      message: `${exp} prior deal${exp === 1 ? "" : "s"}`,
    });
  }

  return flags;
}
