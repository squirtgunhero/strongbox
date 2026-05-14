"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
}

export async function setLoanTags(loanId: string, tags: string[]) {
  const caller = await requireStaff();
  const supabase = await createClient();

  // Normalize and dedupe
  const clean = Array.from(
    new Set(tags.map(normalizeTag).filter((t) => t.length > 0))
  ).slice(0, 12);

  const { error } = await supabase
    .from("loans")
    .update({ tags: clean })
    .eq("id", loanId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "loans",
    record_id: loanId,
    action: "update",
    new_values: { tags: clean },
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath("/admin/loans");
}
