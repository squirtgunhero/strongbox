"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-staff";

export async function saveSettings(formData: FormData) {
  // Only admins can change org_settings. requireAdmin also enforces MFA when
  // the flag is on, so an attacker who got into an aal1 session cannot
  // disable MFA without also having the second factor.
  const caller = await requireAdmin();
  const supabase = await createClient();

  const statesRaw = (formData.get("licensed_states") as string) || "";
  const states = statesRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length === 2);

  const { error } = await supabase
    .from("org_settings")
    .update({
      org_name: formData.get("org_name"),
      licensed_states: states,
      dual_approval_threshold: parseFloat(
        formData.get("dual_approval_threshold") as string
      ),
      max_ltarv: parseFloat(formData.get("max_ltarv") as string) / 100,
      max_ltv: parseFloat(formData.get("max_ltv") as string) / 100,
      max_ltc: parseFloat(formData.get("max_ltc") as string) / 100,
      max_borrower_concentration:
        parseFloat(formData.get("max_borrower_concentration") as string) / 100,
      max_state_concentration:
        parseFloat(formData.get("max_state_concentration") as string) / 100,
      require_mfa_for_staff: formData.get("require_mfa_for_staff") === "on",
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "org_settings",
    record_id: "00000000-0000-0000-0000-000000000001",
    action: "update",
    new_values: {
      licensed_states: states,
      require_mfa_for_staff: formData.get("require_mfa_for_staff") === "on",
    },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/settings");
}
