import type {
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EsignAdapter,
} from "./types";

/**
 * No-op e-signature adapter. Returns a fake envelope id so the rest of the
 * flow (signature_requests row insert, status tracking, audit log) works in
 * a demo without a configured provider. Surfaces clearly in the audit log
 * via the `stub-` prefix on the envelope id.
 */
export class StubEsignAdapter implements EsignAdapter {
  readonly providerName = "stub" as const;
  readonly isConfigured = false;

  async createEnvelope(
    _input: CreateEnvelopeInput
  ): Promise<CreateEnvelopeResult> {
    return {
      envelopeId: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "draft",
    };
  }
}
