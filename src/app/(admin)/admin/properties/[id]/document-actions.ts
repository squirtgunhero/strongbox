"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadPropertyDocument(
  propertyId: string,
  formData: FormData
) {
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
  const storagePath = `property/${propertyId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("loan-documents")
    .upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase
    .from("property_documents")
    .insert({
      property_id: propertyId,
      category,
      filename: file.name,
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    });
  if (insertError) {
    await supabase.storage.from("loan-documents").remove([storagePath]);
    throw new Error(insertError.message);
  }

  await supabase.from("audit_log").insert({
    table_name: "property_documents",
    record_id: propertyId,
    action: "insert",
    new_values: { filename: file.name, category },
    performed_by: user.id,
  });

  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function deletePropertyDocument(
  documentId: string,
  propertyId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: doc } = await supabase
    .from("property_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (doc?.storage_path) {
    await supabase.storage.from("loan-documents").remove([doc.storage_path]);
  }
  await supabase.from("property_documents").delete().eq("id", documentId);

  await supabase.from("audit_log").insert({
    table_name: "property_documents",
    record_id: propertyId,
    action: "update",
    new_values: { deleted: documentId },
    performed_by: user.id,
  });

  revalidatePath(`/admin/properties/${propertyId}`);
}
