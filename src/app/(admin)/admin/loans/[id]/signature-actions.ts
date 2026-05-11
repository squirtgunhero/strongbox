"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSignatureRequest(
  loanId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const documentType = formData.get("document_type") as string;
  const signerEmail = formData.get("signer_email") as string;
  const signerName = formData.get("signer_name") as string;
  const signerBorrowerId = formData.get("signer_borrower_id") as string;

  if (!signerEmail || !signerName) {
    throw new Error("Signer name and email are required");
  }

  // NOTE: this is a stub. Real provider integration sends to DocuSeal/DocuSign
  // and stores the envelope ID. For now, we just record the intent.
  const { error } = await supabase.from("signature_requests").insert({
    loan_id: loanId,
    document_type: documentType,
    signer_borrower_id: signerBorrowerId || null,
    signer_email: signerEmail,
    signer_name: signerName,
    status: "draft",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    table_name: "signature_requests",
    record_id: loanId,
    action: "insert",
    new_values: { document_type: documentType, signer_email: signerEmail },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function updateSignatureStatus(
  requestId: string,
  newStatus: "sent" | "signed" | "declined",
  declinedReason?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "sent") update.sent_at = now;
  if (newStatus === "signed") update.signed_at = now;
  if (newStatus === "declined") {
    update.declined_at = now;
    update.declined_reason = declinedReason || null;
  }

  const { data, error } = await supabase
    .from("signature_requests")
    .update(update)
    .eq("id", requestId)
    .select("loan_id")
    .single();

  if (error || !data) throw new Error("Failed to update");

  await supabase.from("audit_log").insert({
    table_name: "signature_requests",
    record_id: requestId,
    action: "status_change",
    new_values: { status: newStatus },
    performed_by: user.id,
  });

  revalidatePath(`/admin/loans/${data.loan_id}`);
}
