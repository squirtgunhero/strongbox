import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_DUAL_APPROVAL_THRESHOLD } from "@/lib/calculations/holdback";

interface ClientLike {
  from: SupabaseClient["from"];
}

/**
 * org_settings is one row per organization (since migration 035). For an
 * RLS-bound client the restrictive org_isolation policy already filters
 * it to exactly the caller's row, so we just `.single()` it — no id filter.
 * For a service-role client, pass an org-scoped admin client
 * (createOrgAdminClient) so the same single-row guarantee holds.
 *
 * Returns null if no settings row exists for the organization yet.
 */
export async function getOrgSettings(
  client: ClientLike
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from("org_settings")
    .select("*")
    .single();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

/**
 * Load the configured dual-approval threshold for the caller's organization.
 * Returns the migration default if the row is missing or the column is null.
 *
 * Callers in server actions should ALWAYS use this rather than the constant
 * so that compliance changes from the settings page take effect immediately.
 */
export async function getDualApprovalThreshold(
  client: ClientLike
): Promise<number> {
  const settings = await getOrgSettings(client);
  const value = settings?.dual_approval_threshold;
  if (value == null) return DEFAULT_DUAL_APPROVAL_THRESHOLD;
  return Number(value);
}
