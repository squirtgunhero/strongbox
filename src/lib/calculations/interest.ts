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

/**
 * Accrued interest over [fromDate, toDate], splitting at `defaultDate` when
 * the loan crosses into default within the period.
 *
 * Behavior matrix:
 *   - `defaultDate` null or after `toDate`           → all days at `rate`
 *   - `defaultDate` on or before `fromDate`          → all days at `defaultRate`
 *   - `defaultDate` strictly inside the period       → days [from, default) at
 *     `rate`, days [default, to] at `defaultRate`
 *   - `defaultRate` null/zero                        → falls back to `rate`
 *
 * The default date itself is the FIRST day at the elevated rate (the day the
 * loan ticked into default). This matches how note documents typically read.
 */
export function accruedInterestWithDefault(
  principal: number,
  rate: number,
  dayCount: DayCountConvention,
  fromDate: string,
  toDate: string,
  opts: { defaultDate?: string | null; defaultRate?: number | null } = {}
): number {
  const totalDays = daysBetween(fromDate, toDate);
  if (totalDays < 0) {
    throw new Error("toDate must be on or after fromDate");
  }
  const effectiveDefaultRate = opts.defaultRate || 0;
  const defaultDate = opts.defaultDate || null;

  // No default in play — single-rate path.
  if (!defaultDate || !effectiveDefaultRate) {
    return dailyInterest(principal, rate, dayCount) * totalDays;
  }

  const daysAtNormal = daysBetween(fromDate, defaultDate);
  // Default precedes the window entirely.
  if (daysAtNormal <= 0) {
    return dailyInterest(principal, effectiveDefaultRate, dayCount) * totalDays;
  }
  // Default after the window ends.
  if (daysAtNormal >= totalDays) {
    return dailyInterest(principal, rate, dayCount) * totalDays;
  }
  const daysAtDefault = totalDays - daysAtNormal;
  return (
    dailyInterest(principal, rate, dayCount) * daysAtNormal +
    dailyInterest(principal, effectiveDefaultRate, dayCount) * daysAtDefault
  );
}
