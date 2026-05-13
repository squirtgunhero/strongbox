// Credit-pull provider interface. Intentionally provider-agnostic — Experian,
// Equifax, TransUnion, and aggregators like Plaid Credit all surface similar
// data. The adapter implementation handles the consent flow and tokenization;
// callers only see this normalized shape.
//
// IMPORTANT: A credit pull is a regulated action under FCRA + state law:
//   - Borrower consent must be captured + auditable (we record in audit_log)
//   - Soft vs. hard pull distinction must be respected
//   - Storing the full bureau response is NOT permitted in most contracts —
//     keep only the derived score + summary, not the line items
//
// No adapter is shipped today. Wiring Experian requires a signed credentials
// agreement and is gated behind a manual procurement step. Pull this
// interface is in place so when a provider is procured the integration is
// a one-file drop-in.

export type CreditPullKind = "soft" | "hard";

export interface CreditPullInput {
  borrowerId: string;
  firstName: string;
  lastName: string;
  /** SSN, plain (sent over TLS to the provider, never logged). */
  ssn: string;
  dateOfBirth: string; // ISO YYYY-MM-DD
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  /** Soft pulls don't ding the borrower's score; hard pulls do. */
  kind: CreditPullKind;
  /** Free-text reason logged for FCRA permissible-purpose audit. */
  permissiblePurpose: string;
}

export interface CreditPullResult {
  /** FICO 8 or VantageScore 3 — provider-specific. */
  score: number | null;
  scoreModel: string | null;
  /** High-level tradelines summary. */
  openAccounts: number | null;
  delinquentAccounts: number | null;
  derogatoryAccounts: number | null;
  bankruptcies: number | null;
  hardInquiriesLast6Months: number | null;
  /** Provider reference id for audit + downstream dispute handling. */
  providerReference: string;
  /** Timestamp the pull was performed at the bureau. */
  pulledAt: string;
}

export interface CreditAdapter {
  readonly providerName: "experian" | "equifax" | "transunion" | "stub";
  readonly isConfigured: boolean;
  pull(input: CreditPullInput): Promise<CreditPullResult>;
}
