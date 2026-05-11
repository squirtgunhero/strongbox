"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBorrowerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const strOrNull = (key: string): string | null => {
    const v = (formData.get(key) as string)?.trim();
    return v || null;
  };

  // Borrower record (RLS already restricts to user_id = auth.uid())
  const borrowerType = formData.get("borrower_type") as string;
  const borrowerUpdate: Record<string, unknown> = {
    email: strOrNull("email"),
    phone: strOrNull("phone"),
  };
  if (borrowerType === "individual") {
    borrowerUpdate.first_name = strOrNull("first_name");
    borrowerUpdate.last_name = strOrNull("last_name");
  } else {
    borrowerUpdate.entity_name = strOrNull("entity_name");
  }

  const { error: borrowerErr } = await supabase
    .from("borrowers")
    .update(borrowerUpdate)
    .eq("user_id", user.id);
  if (borrowerErr) throw new Error(borrowerErr.message);

  // Profile (full_name, phone) — users can update own profile
  const fullName = formData.get("full_name") as string;
  if (fullName?.trim()) {
    await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: strOrNull("phone"),
      })
      .eq("id", user.id);
  }

  revalidatePath("/portal/profile");
  revalidatePath("/portal");
}
