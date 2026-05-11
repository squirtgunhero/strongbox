import type { DayCountConvention } from "@/lib/types";

const DAYS_IN_YEAR: Record<DayCountConvention, number> = {
  actual_360: 360,
  actual_365: 365,
};

export function dailyInterest(
  principal: number,
  rate: number,
  dayCount: DayCountConvention
): number {
  if (principal <= 0) return 0;
  return (principal * rate) / DAYS_IN_YEAR[dayCount];
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z");
  const to = new Date(toIso + "T00:00:00Z");
  const diff = to.getTime() - from.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function accruedInterest(
  principal: number,
  rate: number,
  dayCount: DayCountConvention,
  fromDate: string,
  toDate: string
): number {
  const days = daysBetween(fromDate, toDate);
  if (days < 0) {
    throw new Error("toDate must be on or after fromDate");
  }
  return dailyInterest(principal, rate, dayCount) * days;
}

export interface DefaultOptions {
  defaultRate?: number | null;
  isDefaulted?: boolean;
}

export function perDiem(
  principal: number,
  rate: number,
  dayCount: DayCountConvention,
  opts: DefaultOptions = {}
): number {
  const effectiveRate =
    opts.isDefaulted && opts.defaultRate ? opts.defaultRate : rate;
  return dailyInterest(principal, effectiveRate, dayCount);
}
