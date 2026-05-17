"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { parseCsvText, findMissingHeaders } from "@/lib/csv/import";
import { createClient } from "@/lib/supabase/server";

export interface BorrowerImportResult {
  ok: boolean;
  message: string;
  processed: number;
  imported: number;
  failed: number;
  errors: string[];
}

const BORROWER_REQUIRED_HEADERS = ["borrower_type"];

function baseResult(): BorrowerImportResult {
  return {
    ok: false,
    message: "",
    processed: 0,
    imported: 0,
    failed: 0,
    errors: [],
  };
}

export async function importBorrowersCsv(
  _prev: BorrowerImportResult,
  formData: FormData
): Promise<BorrowerImportResult> {
  try {
    const caller = await requireStaff();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ...baseResult(), message: "Select a CSV file to upload." };
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return { ...baseResult(), message: "File must use a .csv extension." };
    }

    const parsed = parseCsvText(await file.text());
    const missingHeaders = findMissingHeaders(parsed.headers, BORROWER_REQUIRED_HEADERS);
    if (missingHeaders.length > 0) {
      return {
        ...baseResult(),
        message: `Missing required columns: ${missingHeaders.join(", ")}`,
      };
    }
    if (parsed.rows.length === 0) {
      return { ...baseResult(), message: "CSV has no data rows." };
    }

    const supabase = await createClient();
    const errors: string[] = [];
    let imported = 0;

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const rowNum = idx + 2;
      const row = parsed.rows[idx];
      const borrowerType = (row.borrower_type || "").toLowerCase();
      const payload: Record<string, unknown> = {
        borrower_type: borrowerType,
        email: row.email || null,
        phone: row.phone || null,
        formation_state: row.formation_state || null,
        deals_completed: Number.parseInt(row.deals_completed || "0", 10) || 0,
        notes: row.notes || null,
      };

      if (borrowerType !== "individual" && borrowerType !== "entity") {
        errors.push(`Row ${rowNum}: borrower_type must be individual or entity`);
        continue;
      }

      if (borrowerType === "individual") {
        if (!row.first_name || !row.last_name) {
          errors.push(
            `Row ${rowNum}: first_name and last_name are required for individual borrowers`
          );
          continue;
        }
        payload.first_name = row.first_name;
        payload.last_name = row.last_name;
        payload.entity_name = null;
      } else {
        if (!row.entity_name) {
          errors.push(`Row ${rowNum}: entity_name is required for entity borrowers`);
          continue;
        }
        payload.entity_name = row.entity_name;
        payload.first_name = null;
        payload.last_name = null;
      }

      const { data: borrower, error } = await supabase
        .from("borrowers")
        .insert(payload)
        .select("id")
        .single();
      if (error || !borrower) {
        errors.push(`Row ${rowNum}: ${error?.message || "insert failed"}`);
        continue;
      }

      await supabase.from("audit_log").insert({
        table_name: "borrowers",
        record_id: borrower.id,
        action: "insert",
        new_values: { borrower_type: payload.borrower_type, source: "csv_import" },
        performed_by: caller.userId,
      });
      imported++;
    }

    const failed = parsed.rows.length - imported;
    revalidatePath("/admin/borrowers");
    revalidatePath("/admin");

    if (imported === 0) {
      return {
        ok: false,
        message: "No borrowers were imported.",
        processed: parsed.rows.length,
        imported,
        failed,
        errors,
      };
    }

    return {
      ok: failed === 0,
      message:
        failed === 0
          ? `Imported ${imported} borrower${imported === 1 ? "" : "s"}.`
          : `Imported ${imported} borrowers with ${failed} row error${failed === 1 ? "" : "s"}.`,
      processed: parsed.rows.length,
      imported,
      failed,
      errors,
    };
  } catch (error) {
    return {
      ...baseResult(),
      message: error instanceof Error ? error.message : "Borrower import failed",
    };
  }
}
