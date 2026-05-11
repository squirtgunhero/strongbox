"use server";

import { updateLoanStatus } from "@/app/(admin)/admin/loans/actions";

// Re-export — needed for drag-and-drop to call the existing transition logic
// (which includes the conditions-cleared check before funding).
export async function moveLoan(loanId: string, newStatus: string) {
  await updateLoanStatus(loanId, newStatus);
}
