// Concentration analysis for the lending book.
//
// Inputs: deployed loans with their current principal, primary borrower id,
// and property state. Outputs: per-borrower and per-state shares of deployed
// capital, plus a list of any that breach the configured thresholds.

export interface ConcentrationLoan {
  current_principal: number;
  borrower_id: string;
  borrower_label: string;
  state: string;
}

export interface ConcentrationBucket {
  key: string;
  label: string;
  exposure: number;
  share: number; // 0..1 of total deployed
}

export interface ConcentrationReport {
  totalDeployed: number;
  byBorrower: ConcentrationBucket[];
  byState: ConcentrationBucket[];
  breaches: Array<
    ConcentrationBucket & {
      kind: "borrower" | "state";
      threshold: number;
    }
  >;
}

export function analyzeConcentration(
  loans: ConcentrationLoan[],
  thresholds: { maxBorrower: number; maxState: number }
): ConcentrationReport {
  const totalDeployed = loans.reduce(
    (s, l) => s + (Number(l.current_principal) || 0),
    0
  );

  const borrowers = new Map<string, ConcentrationBucket>();
  const states = new Map<string, ConcentrationBucket>();

  for (const l of loans) {
    const amt = Number(l.current_principal) || 0;
    const b = borrowers.get(l.borrower_id);
    if (b) {
      b.exposure += amt;
    } else {
      borrowers.set(l.borrower_id, {
        key: l.borrower_id,
        label: l.borrower_label,
        exposure: amt,
        share: 0,
      });
    }
    const s = states.get(l.state);
    if (s) {
      s.exposure += amt;
    } else {
      states.set(l.state, {
        key: l.state,
        label: l.state,
        exposure: amt,
        share: 0,
      });
    }
  }

  // Fill in share + sort by exposure descending
  const byBorrower = Array.from(borrowers.values())
    .map((b) => ({
      ...b,
      share: totalDeployed > 0 ? b.exposure / totalDeployed : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);
  const byState = Array.from(states.values())
    .map((s) => ({
      ...s,
      share: totalDeployed > 0 ? s.exposure / totalDeployed : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  const breaches: ConcentrationReport["breaches"] = [];
  for (const b of byBorrower) {
    if (b.share > thresholds.maxBorrower) {
      breaches.push({ ...b, kind: "borrower", threshold: thresholds.maxBorrower });
    }
  }
  for (const s of byState) {
    if (s.share > thresholds.maxState) {
      breaches.push({ ...s, kind: "state", threshold: thresholds.maxState });
    }
  }

  return { totalDeployed, byBorrower, byState, breaches };
}
