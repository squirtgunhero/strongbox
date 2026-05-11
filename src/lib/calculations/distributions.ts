function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function investorShareOfInterest(
  interestAmount: number,
  positionPercentage: number
): number {
  if (interestAmount < 0) {
    throw new Error("Interest amount cannot be negative");
  }
  if (positionPercentage < 0 || positionPercentage > 1) {
    throw new Error("Percentage must be between 0 and 1");
  }
  return roundCents(interestAmount * positionPercentage);
}

export function validatePositionAgainstLoan(
  newAmount: number,
  existingPositions: { amount: number }[],
  loanAmount: number
): void {
  if (newAmount <= 0) {
    throw new Error("Position amount must be greater than zero");
  }
  const existingTotal = existingPositions.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  if (existingTotal + newAmount > loanAmount) {
    throw new Error(
      `Position would exceed loan amount: $${(existingTotal + newAmount).toLocaleString()} > $${loanAmount.toLocaleString()}`
    );
  }
}

interface DistributionForReturn {
  amount: number;
  distribution_date: string; // YYYY-MM-DD
}

export interface YtdReturnResult {
  totalDistributed: number;
  annualizedReturn: number;
}

export function ytdReturn(
  distributions: DistributionForReturn[],
  committedCapital: number,
  asOfDate: string
): YtdReturnResult {
  if (committedCapital <= 0) {
    return { totalDistributed: 0, annualizedReturn: 0 };
  }

  const asOf = new Date(asOfDate + "T00:00:00Z");
  const yearStart = new Date(
    Date.UTC(asOf.getUTCFullYear(), 0, 1)
  );

  const ytdDists = distributions.filter((d) => {
    const dt = new Date(d.distribution_date + "T00:00:00Z");
    return dt >= yearStart && dt <= asOf;
  });

  const totalDistributed = ytdDists.reduce(
    (sum, d) => sum + Number(d.amount),
    0
  );

  const daysElapsed =
    (asOf.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
  const periodReturn = totalDistributed / committedCapital;
  const annualizedReturn = periodReturn * (365 / daysElapsed);

  return {
    totalDistributed,
    annualizedReturn,
  };
}
