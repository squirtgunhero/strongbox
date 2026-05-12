"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCondition(
  loanId: string,
  description: string,
  dueDate?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!description.trim()) throw new Error("Description required");

  const { error } = await supabase.from("loan_conditions").insert({
    loan_id: loanId,
    description: description.trim(),
    due_date: dueDate || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function setConditionDueDate(
  conditionId: string,
  loanId: string,
  dueDate: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("loan_conditions")
    .update({ due_date: dueDate || null })
    .eq("id", conditionId);
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: template } = await supabase
    .from("condition_templates")
    .select("conditions")
    .eq("id", templateId)
    .single();
  if (!template) throw new Error("Template not found");

  const rows = (template.conditions as string[]).map((description) => ({
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
