"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadDocument(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "other";

  if (!file) throw new Error("No file provided");
  if (file.size > 25 * 1024 * 1024) throw new Error("File exceeds 25MB limit");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${loanId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("loan-documents")
    .upload(storagePath, file);

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("loan_documents").insert({
    loan_id: loanId,
    category,
    filename: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_by: user.id,
  });

  if (insertError) {
    // Roll back the storage upload
    await supabase.storage.from("loan-documents").remove([storagePath]);
    throw new Error(insertError.message);
  }

  await supabase.from("audit_log").insert({
    table_name: "loan_documents",
    record_id: loanId,
    action: "insert",
    new_values: { filename: file.name, category },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function getDocumentSignedUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("loan-documents")
    .createSignedUrl(storagePath, 60); // 60s
  if (error) throw new Error(error.message);

  // Audit document access
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_log").insert({
      table_name: "loan_documents",
      record_id: storagePath,
      action: "access",
      performed_by: user.id,
    });
  }

  return data.signedUrl;
}
