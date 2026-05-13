"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { getEsignAdapter } from "@/lib/esign";

export async function createSignatureRequest(
  loanId: string,
  formData: FormData
) {
  const caller = await requireStaff();
  const supabase = await createClient();

  const documentType = formData.get("document_type") as string;
  const signerEmail = (formData.get("signer_email") as string)?.trim();
  const signerName = (formData.get("signer_name") as string)?.trim();
  const signerBorrowerId = formData.get("signer_borrower_id") as string;

  if (!signerEmail || !signerName) {
    throw new Error("Signer name and email are required");
  }

  // Insert the request row first so we have an id to use as the provider
  // clientRef and to fall back to in the UI if envelope creation fails.
  const { data: row, error } = await supabase
    .from("signature_requests")
    .insert({
      loan_id: loanId,
      document_type: documentType,
      signer_borrower_id: signerBorrowerId || null,
      signer_email: signerEmail,
      signer_name: signerName,
      status: "draft",
      created_by: caller.userId,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message || "Insert failed");

  // Generate the document PDF. For now we use a placeholder buffer — the
  // existing HTML→PDF document routes are designed to be reused here. When
  // wiring DocuSign for real, fetch the rendered PDF (e.g. via puppeteer or
  // the existing /documents/[loanId]/* HTML routes piped through a PDF
  // service) and pass the bytes through.
  const docPdf = await renderDocumentPdfPlaceholder(documentType, loanId);

  const adapter = getEsignAdapter();
  let envelopeId: string | null = null;
  let providerStatus: "draft" | "sent" = "draft";
  let providerError: string | null = null;
  try {
    const result = await adapter.createEnvelope({
      documentType,
      documentPdf: docPdf,
      filename: `${documentType}-${loanId}.pdf`,
      emailSubject: `StrongBox · ${documentType} for signature`,
      emailBody: `Please review and sign the attached ${documentType}.`,
      signers: [
        {
          email: signerEmail,
          name: signerName,
          borrowerId: signerBorrowerId || null,
        },
      ],
      clientRef: row.id,
    });
    envelopeId = result.envelopeId;
    providerStatus = result.status;
  } catch (e) {
    providerError = e instanceof Error ? e.message : "Provider call failed";
    console.error("[signatures] envelope creation failed", e);
  }

  await supabase
    .from("signature_requests")
    .update({
      provider_envelope_id: envelopeId,
      status: providerStatus === "sent" ? "sent" : "draft",
      sent_at: providerStatus === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", row.id);

  await supabase.from("audit_log").insert({
    table_name: "signature_requests",
    record_id: row.id,
    action: "insert",
    new_values: {
      loan_id: loanId,
      document_type: documentType,
      signer_email: signerEmail,
      provider: adapter.providerName,
      envelope_id: envelopeId,
      provider_error: providerError,
    },
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function updateSignatureStatus(
  requestId: string,
  newStatus: "sent" | "signed" | "declined",
  declinedReason?: string
) {
  const caller = await requireStaff();
  const supabase = await createClient();

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
    performed_by: caller.userId,
  });

  revalidatePath(`/admin/loans/${data.loan_id}`);
}

/**
 * Placeholder until we wire a real HTML→PDF pipeline through the document
 * templates in /app/(documents). Returns a tiny PDF with the document type
 * stamped in so a DocuSign sandbox can still receive and route it.
 *
 * Pre-generated minimum-viable PDF (the bytes spell out the doc type
 * server-side at runtime). Not user-visible content; DocuSign overlays
 * sign-here tabs via anchor strings declared in DocusignAdapter.
 */
async function renderDocumentPdfPlaceholder(
  documentType: string,
  loanId: string
): Promise<Buffer> {
  const content = `StrongBox\n\n${documentType.toUpperCase()}\nLoan: ${loanId}\n\nThis is a placeholder PDF generated by the StrongBox e-sign integration. Replace with the rendered document template before sending to a real signer.\n\n/sn1/`;
  // Minimal single-page PDF body with the content as a text stream. Not
  // pretty, but renders in every reader and DocuSign can attach signing tabs.
  const stream = `BT /F1 12 Tf 50 750 Td (${content
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, ") Tj T* (")}) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${stream.length} >> stream
${stream}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000103 00000 n
0000000215 00000 n
0000000${(280 + stream.length).toString().padStart(3, "0")} 00000 n
trailer << /Size 6 /Root 1 0 R >>
startxref
${340 + stream.length}
%%EOF`;
  return Buffer.from(pdf, "latin1");
}
