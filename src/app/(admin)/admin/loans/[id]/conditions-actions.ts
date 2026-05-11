"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCondition(loanId: string, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!description.trim()) throw new Error("Description required");

  const { error } = await supabase.from("loan_conditions").insert({
    loan_id: loanId,
    description: description.trim(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function toggleCondition(
  conditionId: string,
  loanId: string,
  satisfied: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("loan_conditions")
    .update({
      is_satisfied: satisfied,
      satisfied_at: satisfied ? new Date().toISOString() : null,
      satisfied_by: satisfied ? user.id : null,
    })
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function deleteCondition(conditionId: string, loanId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("loan_conditions")
    .delete()
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}
