"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function linkBorrowerToAuthUser(
  borrowerId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const authUserId = (formData.get("user_id") as string)?.trim();
  if (!authUserId) throw new Error("User UUID required");

  // Look up the corresponding profile and ensure it's a borrower role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", authUserId)
    .single();

  if (!profile) {
    throw new Error(
      "No profile found for that user UUID. Create the auth user in Supabase first, then add a row to the profiles table with role='borrower'."
    );
  }

  if (profile.role !== "borrower") {
    throw new Error(
      `Profile role is "${profile.role}", expected "borrower". Update the profile role first.`
    );
  }

  const { error } = await supabase
    .from("borrowers")
    .update({ user_id: authUserId })
    .eq("id", borrowerId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "update",
    new_values: { linked_user_id: authUserId },
    performed_by: user.id,
  });

  revalidatePath("/admin/borrowers");
}

export async function linkInvestorToAuthUser(
  investorId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const authUserId = (formData.get("user_id") as string)?.trim();
  if (!authUserId) throw new Error("User UUID required");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUserId)
    .single();

  if (!profile) {
    throw new Error(
      "No profile found for that user UUID. Create the auth user in Supabase first, then add a row to the profiles table with role='investor'."
    );
  }
  if (profile.role !== "investor") {
    throw new Error(
      `Profile role is "${profile.role}", expected "investor". Update the profile role first.`
    );
  }

  const { error } = await supabase
    .from("investors")
    .update({ user_id: authUserId })
    .eq("id", investorId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "investors",
    record_id: investorId,
    action: "update",
    new_values: { linked_user_id: authUserId },
    performed_by: user.id,
  });

  revalidatePath(`/admin/investors/${investorId}`);
}
