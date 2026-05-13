import type {
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  EsignAdapter,
} from "./types";

/**
 * DocuSign REST API adapter.
 *
 * Authentication uses JWT grant (server-to-server, no user OAuth). You'll need:
 *   - DOCUSIGN_BASE_URL          e.g. https://demo.docusign.net (sandbox)
 *                                       https://www.docusign.net (prod)
 *   - DOCUSIGN_ACCOUNT_ID        UUID from "API and Keys" → "API Account ID"
 *   - DOCUSIGN_INTEGRATION_KEY   "Integration Key" UUID
 *   - DOCUSIGN_USER_ID           Impersonated user GUID
 *   - DOCUSIGN_PRIVATE_KEY       RSA private key (multi-line, in env var)
 *   - DOCUSIGN_WEBHOOK_HMAC_KEY  Optional HMAC key for verifying Connect webhooks
 *
 * Without these set, `isConfigured` is false and we transparently fall back to
 * the stub adapter — the StrongBox UI still tracks signature_requests state
 * but no envelope is dispatched. This lets you ship the integration code
 * before procuring the DocuSign account.
 *
 * NOTE: This is the minimum viable path. Production deployments should add:
 *   - JWT cache (tokens are valid 1h; we currently mint per call)
 *   - Retry on rate-limit responses
 *   - Connect webhook listener path
 *   - Recipient signing order / anchor tabs for multi-signer flows
 */
export class DocusignAdapter implements EsignAdapter {
  readonly providerName = "docusign" as const;
  readonly isConfigured: boolean;

  constructor(
    private readonly env = {
      baseUrl: process.env.DOCUSIGN_BASE_URL,
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      userId: process.env.DOCUSIGN_USER_ID,
      privateKey: process.env.DOCUSIGN_PRIVATE_KEY,
    }
  ) {
    this.isConfigured =
      Boolean(env.baseUrl) &&
      Boolean(env.accountId) &&
      Boolean(env.integrationKey) &&
      Boolean(env.userId) &&
      Boolean(env.privateKey);
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    if (!this.isConfigured) {
      throw new Error("DocuSign not configured");
    }
    const token = await this.getAccessToken();

    // Compose the envelope. We attach the PDF as a single signing document
    // and apply a sign-here anchor at the bottom-right of page 1 by default.
    // For real production work, replace `recipients[0].tabs` with anchor
    // strings keyed to text in the generated PDF.
    const base64 = Buffer.from(input.documentPdf).toString("base64");
    const envelopePayload = {
      emailSubject: input.emailSubject,
      emailBlurb: input.emailBody,
      status: "sent",
      documents: [
        {
          documentBase64: base64,
          documentId: "1",
          fileExtension: "pdf",
          name: input.filename,
        },
      ],
      recipients: {
        signers: input.signers.map((s, i) => ({
          email: s.email,
          name: s.name,
          recipientId: String(i + 1),
          routingOrder: String(i + 1),
          tabs: {
            signHereTabs: [
              {
                anchorString: "/sn1/",
                anchorIgnoreIfNotPresent: "true",
                anchorYOffset: "0",
              },
            ],
          },
          clientUserId: s.borrowerId || undefined,
        })),
      },
      customFields: {
        textCustomFields: [
          {
            name: "strongbox_ref",
            value: input.clientRef,
            show: "false",
            required: "false",
          },
        ],
      },
    };

    const res = await fetch(
      `${this.env.baseUrl}/restapi/v2.1/accounts/${this.env.accountId}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envelopePayload),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DocuSign envelope create failed: ${res.status} ${text}`);
    }
    const body = (await res.json()) as { envelopeId: string; status: string };
    return {
      envelopeId: body.envelopeId,
      status: body.status === "sent" ? "sent" : "draft",
    };
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    if (!this.isConfigured) return;
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.env.baseUrl}/restapi/v2.1/accounts/${this.env.accountId}/envelopes/${envelopeId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "voided", voidedReason: reason }),
      }
    );
    if (!res.ok) {
      throw new Error(`DocuSign void failed: ${res.status} ${await res.text()}`);
    }
  }

  /**
   * Mint a JWT, exchange for an access token. DocuSign caches the JWT
   * server-side based on claim hash, so back-to-back calls within the
   * 1-hour expiry are cheap, but we make no caching guarantees ourselves.
   * For high-volume flows, wrap in an in-memory TTL cache.
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured) throw new Error("DocuSign not configured");
    // DocuSign auth host is account-region-specific. Demo accounts use the
    // account-d host; production uses account.docusign.com. We mirror the
    // restapi base URL convention.
    const authHost = this.env.baseUrl!.includes("demo")
      ? "https://account-d.docusign.com"
      : "https://account.docusign.com";

    const jwt = await this.signJwt({
      iss: this.env.integrationKey!,
      sub: this.env.userId!,
      aud: authHost.replace(/^https:\/\//, ""),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "signature impersonation",
    });

    const res = await fetch(`${authHost}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `DocuSign JWT exchange failed: ${res.status} ${await res.text()}`
      );
    }
    const body = (await res.json()) as { access_token: string };
    return body.access_token;
  }

  /**
   * Sign a JWT with the DocuSign RSA private key using Node's crypto.
   * We avoid the `jsonwebtoken` package to keep zero new deps; DocuSign
   * accepts the standard RS256-signed format.
   */
  private async signJwt(claims: Record<string, unknown>): Promise<string> {
    const { createSign } = await import("node:crypto");
    const header = { alg: "RS256", typ: "JWT" };
    const b64url = (input: string | Buffer) =>
      (typeof input === "string" ? Buffer.from(input) : input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const headerPart = b64url(JSON.stringify(header));
    const payloadPart = b64url(JSON.stringify(claims));
    const signingInput = `${headerPart}.${payloadPart}`;
    const signer = createSign("RSA-SHA256");
    signer.update(signingInput);
    signer.end();
    const sig = signer.sign(this.env.privateKey!);
    return `${signingInput}.${b64url(sig)}`;
  }
}
