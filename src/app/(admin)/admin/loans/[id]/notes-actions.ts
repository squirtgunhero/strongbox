"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";

export async function addLoanNote(loanId: string, formData: FormData) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const body = (formData.get("body") as string)?.trim();
  if (!body) throw new Error("Note cannot be empty");

  const { error } = await supabase.from("loan_notes").insert({
    loan_id: loanId,
    author_id: caller.userId,
    body,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/loans/${loanId}`);
}
