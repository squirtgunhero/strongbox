import type { CreditAdapter, CreditPullInput, CreditPullResult } from "./types";

/**
 * Credit-pull adapter — no provider wired. Until you sign with Experian /
 * Equifax / TransUnion or an aggregator, calls to `pull()` throw. The
 * borrower record stores manually-entered scores in the meantime.
 */
class UnconfiguredCreditAdapter implements CreditAdapter {
  readonly providerName = "stub" as const;
  readonly isConfigured = false;
  async pull(_input: CreditPullInput): Promise<CreditPullResult> {
    throw new Error(
      "No credit bureau adapter is configured. Set EXPERIAN_API_KEY (or your chosen bureau's env) and add a corresponding adapter implementation."
    );
  }
}

let cached: CreditAdapter | null = null;
export function getCreditAdapter(): CreditAdapter {
  if (cached) return cached;
  cached = new UnconfiguredCreditAdapter();
  console.info("[credit] no provider configured — adapter is unconfigured");
  return cached;
}

export type { CreditAdapter } from "./types";
