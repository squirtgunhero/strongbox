"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function parseConditions(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = ((formData.get("name") as string) || "").trim();
  const raw = (formData.get("conditions") as string) || "";
  if (!name) throw new Error("Name required");
  const conditions = parseConditions(raw);
  if (conditions.length === 0)
    throw new Error("At least one condition required");

  const { error } = await supabase
    .from("condition_templates")
    .insert({ name, conditions });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/condition-templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = ((formData.get("name") as string) || "").trim();
  const raw = (formData.get("conditions") as string) || "";
  if (!name) throw new Error("Name required");
  const conditions = parseConditions(raw);
  if (conditions.length === 0)
    throw new Error("At least one condition required");

  const { error } = await supabase
    .from("condition_templates")
    .update({ name, conditions })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/condition-templates");
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: tpl } = await supabase
    .from("condition_templates")
    .select("is_builtin")
    .eq("id", id)
    .single();
  if (tpl?.is_builtin) {
    throw new Error("Built-in templates cannot be deleted (you can edit them)");
  }

  const { error } = await supabase
    .from("condition_templates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/condition-templates");
}
