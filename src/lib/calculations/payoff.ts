import type { DayCountConvention } from "@/lib/types";
import { accruedInterest, perDiem } from "./interest";

export interface PayoffInput {
  currentPrincipal: number;
  interestRate: number;
  defaultRate?: number | null;
  dayCount: DayCountConvention;
  paidThroughDate: string;
  payoffDate: string;
  outstandingLateFees: number;
  isDefaulted: boolean;
  extensionFees?: number;
}

export interface PayoffResult {
  principal: number;
  accruedInterest: number;
  lateFees: number;
  extensionFees: number;
  perDiem: number;
  daysAccrued: number;
  total: number;
}

export function calculatePayoff(input: PayoffInput): PayoffResult {
  const effectiveRate =
    input.isDefaulted && input.defaultRate ? input.defaultRate : input.interestRate;

  const interest = accruedInterest(
    input.currentPrincipal,
    effectiveRate,
    input.dayCount,
    input.paidThroughDate,
    input.payoffDate
  );

  const diem = perDiem(input.currentPrincipal, input.interestRate, input.dayCount, {
    defaultRate: input.defaultRate,
    isDefaulted: input.isDefaulted,
  });

  const daysAccrued = Math.round(
    (new Date(input.payoffDate + "T00:00:00Z").getTime() -
      new Date(input.paidThroughDate + "T00:00:00Z").getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const extensionFees = input.extensionFees ?? 0;

  return {
    principal: input.currentPrincipal,
    accruedInterest: interest,
    lateFees: input.outstandingLateFees,
    extensionFees,
    perDiem: diem,
    daysAccrued,
    total:
      input.currentPrincipal + interest + input.outstandingLateFees + extensionFees,
  };
}
