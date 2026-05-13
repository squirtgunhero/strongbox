"use server";

import { requireStaff } from "@/lib/auth/require-staff";
import { getPropertyAdapter } from "@/lib/property";
import type { PropertyLookupResult } from "@/lib/property/types";

interface LookupArgs {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Server action callable from the loan-intake / property form. Returns a
 * lookup result that the client can use to pre-fill ARV, square footage, etc.
 * `configured: false` lets the UI render a "Connect RentCast" CTA instead
 * of an error toast.
 */
export async function lookupPropertyData(args: LookupArgs): Promise<
  | { configured: false }
  | { configured: true; data: PropertyLookupResult }
  | { configured: true; error: string }
> {
  await requireStaff();
  const adapter = getPropertyAdapter();
  if (!adapter.isConfigured) return { configured: false };
  try {
    const data = await adapter.lookup(args);
    return { configured: true, data };
  } catch (e) {
    return {
      configured: true,
      error: e instanceof Error ? e.message : "Lookup failed",
    };
  }
}
