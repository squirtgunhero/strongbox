"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addLoanNote(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const body = (formData.get("body") as string)?.trim();
  if (!body) throw new Error("Note cannot be empty");

  const { error } = await supabase.from("loan_notes").insert({
    loan_id: loanId,
    author_id: user.id,
    body,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}
