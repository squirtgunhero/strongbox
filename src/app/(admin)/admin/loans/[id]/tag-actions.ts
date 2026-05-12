"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
}

export async function setLoanTags(loanId: string, tags: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
  revalidatePath("/admin/loans");
}
