import type {
  AchDebitInput,
  AchDebitResult,
  PaymentsAdapter,
} from "./types";

/** No-op payments adapter — borrower-submitted intents stay in `submitted`
 *  until staff manually verifies them. */
export class StubPaymentsAdapter implements PaymentsAdapter {
  readonly providerName = "stub" as const;
  readonly isConfigured = false;
  async createAchDebit(input: AchDebitInput): Promise<AchDebitResult> {
    return {
      providerIntentId: `stub-${input.intentRowId}`,
      providerStatus: "manual",
    };
  }
}
