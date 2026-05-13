import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_DUAL_APPROVAL_THRESHOLD } from "@/lib/calculations/holdback";

interface ClientLike {
  from: SupabaseClient["from"];
}

/**
 * Load the configured dual-approval threshold from `org_settings.id = 1`.
 * Returns the migration default if the row is missing or the column is null.
 *
 * Callers in server actions should ALWAYS use this rather than the constant
 * so that compliance changes from the settings page take effect immediately.
 */
export async function getDualApprovalThreshold(
  client: ClientLike
): Promise<number> {
  const { data, error } = await client
    .from("org_settings")
    .select("dual_approval_threshold")
    .eq("id", 1)
    .single();
  if (error || !data || data.dual_approval_threshold == null) {
    return DEFAULT_DUAL_APPROVAL_THRESHOLD;
  }
  return Number(data.dual_approval_threshold);
}
