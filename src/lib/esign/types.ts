// Provider-agnostic e-signature interface. The signature_requests table is
// the source of truth; this adapter just translates between StrongBox concepts
// (document_type, signer_email/name) and the provider's envelope/recipient API.
//
// To swap providers (e.g. DocuSign → DocuSeal), implement EsignAdapter for the
// new provider and wire it in src/lib/esign/index.ts.

export interface EsignSigner {
  email: string;
  name: string;
  /** Optional borrower id we use to correlate webhook callbacks. */
  borrowerId?: string | null;
}

export interface CreateEnvelopeInput {
  documentType: string;
  /** PDF bytes (we generate from our HTML→PDF templates). */
  documentPdf: Buffer | Uint8Array;
  /** Filename shown in the e-sign UI. */
  filename: string;
  /** Subject + body for the email the provider sends to the signer(s). */
  emailSubject: string;
  emailBody: string;
  signers: EsignSigner[];
  /** External reference we'll use to correlate webhook events back to the
   *  signature_requests row. */
  clientRef: string;
}

export interface CreateEnvelopeResult {
  envelopeId: string;
  status: "draft" | "sent";
}

export interface EsignAdapter {
  /** Unique provider identifier, used to gate webhooks. */
  readonly providerName: "docusign" | "docuseal" | "stub";
  /** True iff env vars are configured and createEnvelope will work. */
  readonly isConfigured: boolean;
  createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult>;
  /** Resend the envelope email to the signer. */
  resendEnvelope?(envelopeId: string): Promise<void>;
  /** Void a sent envelope (cancellation). */
  voidEnvelope?(envelopeId: string, reason: string): Promise<void>;
}
