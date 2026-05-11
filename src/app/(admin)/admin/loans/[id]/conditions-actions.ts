"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CONDITION_TEMPLATES } from "@/lib/condition-templates";

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

export async function applyConditionTemplate(
  loanId: string,
  templateId: string
) {
  const template = CONDITION_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Template not found");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rows = template.conditions.map((description) => ({
    loan_id: loanId,
    description,
  }));

  const { error } = await supabase.from("loan_conditions").insert(rows);
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
