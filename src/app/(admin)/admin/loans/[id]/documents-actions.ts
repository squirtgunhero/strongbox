"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUpload } from "@/lib/uploads/validate";

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

  // SECURITY: verify magic bytes + reject HTML/SVG/script extensions to
  // prevent stored-XSS via an uploaded payload that later renders inline
  // in an admin's browser.
  const check = await validateUpload(file);
  if (!check.ok) {
    throw new Error(check.reason || "Rejected upload");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${loanId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("loan-documents")
    .upload(storagePath, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: docRow, error: insertError } = await supabase
    .from("loan_documents")
    .insert({
      loan_id: loanId,
      category,
      filename: file.name,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !docRow) {
    // Roll back the storage upload
    await supabase.storage.from("loan-documents").remove([storagePath]);
    throw new Error(insertError?.message || "Insert failed");
  }

  // audit_log.record_id is a UUID column — use the document id, not the loan id.
  await supabase.from("audit_log").insert({
    table_name: "loan_documents",
    record_id: docRow.id,
    action: "insert",
    new_values: { loan_id: loanId, filename: file.name, category },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function getDocumentSignedUrl(storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Look up the document row first so we can audit by its UUID. RLS will reject
  // the lookup if the caller doesn't have access to this loan's documents.
  const { data: docRow, error: lookupError } = await supabase
    .from("loan_documents")
    .select("id, loan_id, filename")
    .eq("storage_path", storagePath)
    .single();
  if (lookupError || !docRow) throw new Error("Document not found");

  const { data, error } = await supabase.storage
    .from("loan-documents")
    .createSignedUrl(storagePath, 60); // 60s
  if (error) throw new Error(error.message);

  // Audit document access — record_id is the document UUID. The prior
  // implementation wrote the storage path into a uuid column and silently
  // failed on every call, leaving zero document-access audit trail.
  await supabase.from("audit_log").insert({
    table_name: "loan_documents",
    record_id: docRow.id,
    action: "access",
    new_values: { loan_id: docRow.loan_id, filename: docRow.filename },
    performed_by: user.id,
  });

  return data.signedUrl;
}
