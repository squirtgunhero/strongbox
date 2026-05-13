import { DocusignAdapter } from "./docusign";
import { StubEsignAdapter } from "./stub";
import type { EsignAdapter } from "./types";

let cached: EsignAdapter | null = null;

/**
 * Resolve the active e-sign adapter. DocuSign if its env vars are configured,
 * otherwise a no-op stub that still lets the UI track state and audit log
 * records progress. The choice is logged once on first resolution so it's
 * obvious from the function logs which provider is wired up.
 */
export function getEsignAdapter(): EsignAdapter {
  if (cached) return cached;
  const docusign = new DocusignAdapter();
  if (docusign.isConfigured) {
    console.info("[esign] using DocuSign adapter");
    cached = docusign;
  } else {
    console.info("[esign] DocuSign env not set — using stub adapter");
    cached = new StubEsignAdapter();
  }
  return cached;
}

export type { EsignAdapter } from "./types";
