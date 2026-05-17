"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { findMissingHeaders, parseCsvText } from "@/lib/csv/import";
import { createClient } from "@/lib/supabase/server";

export interface LoanImportResult {
  ok: boolean;
  message: string;
  processed: number;
  imported: number;
  failed: number;
  errors: string[];
}

const LOAN_REQUIRED_HEADERS = [
  "borrower_type",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "loan_amount",
  "interest_rate",
  "term_months",
];

const VALID_STATUSES = new Set(["lead", "application"]);
const VALID_LOAN_PURPOSE = new Set(["purchase", "refinance", "rehab", "ground_up"]);
const VALID_EXIT_STRATEGY = new Set(["sale", "refinance", "rental"]);
const VALID_PROPERTY_TYPE = new Set([
  "single_family",
  "multi_family",
  "commercial",
  "land",
  "mixed_use",
]);
const VALID_DAY_COUNT = new Set(["actual_360", "actual_365"]);

function toNumber(value: string): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function toRate(value: string): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  return n > 1 ? n / 100 : n;
}

function emptyResult(): LoanImportResult {
  return {
    ok: false,
    message: "",
    processed: 0,
    imported: 0,
    failed: 0,
    errors: [],
  };
}

export async function importLoansCsv(
  _prev: LoanImportResult,
  formData: FormData
): Promise<LoanImportResult> {
  try {
    const caller = await requireStaff();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ...emptyResult(), message: "Select a CSV file to upload." };
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return { ...emptyResult(), message: "File must use a .csv extension." };
    }

    const parsed = parseCsvText(await file.text());
    const missingHeaders = findMissingHeaders(parsed.headers, LOAN_REQUIRED_HEADERS);
    if (missingHeaders.length > 0) {
      return {
        ...emptyResult(),
        message: `Missing required columns: ${missingHeaders.join(", ")}`,
      };
    }
    if (parsed.rows.length === 0) {
      return { ...emptyResult(), message: "CSV has no data rows." };
    }

    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("org_settings")
      .select("licensed_states")
      .eq("id", 1)
      .single();
    const licensedStates: string[] = settings?.licensed_states || [];

    const errors: string[] = [];
    let imported = 0;

    for (let idx = 0; idx < parsed.rows.length; idx++) {
      const rowNum = idx + 2;
      const row = parsed.rows[idx];
      let propertyId: string | null = null;
      let borrowerId: string | null = null;
      let loanId: string | null = null;

      const borrowerType = (row.borrower_type || "").toLowerCase();
      if (borrowerType !== "individual" && borrowerType !== "entity") {
        errors.push(`Row ${rowNum}: borrower_type must be individual or entity`);
        continue;
      }

      if (borrowerType === "individual" && (!row.first_name || !row.last_name)) {
        errors.push(`Row ${rowNum}: first_name and last_name are required for individuals`);
        continue;
      }
      if (borrowerType === "entity" && !row.entity_name) {
        errors.push(`Row ${rowNum}: entity_name is required for entity borrowers`);
        continue;
      }

      const state = (row.address_state || "").toUpperCase();
      if (!state) {
        errors.push(`Row ${rowNum}: address_state is required`);
        continue;
      }
      if (licensedStates.length > 0 && !licensedStates.includes(state)) {
        errors.push(
          `Row ${rowNum}: cannot originate in ${state}; not in licensed_states`
        );
        continue;
      }

      const status = (row.status || "lead").toLowerCase();
      if (!VALID_STATUSES.has(status)) {
        errors.push(`Row ${rowNum}: status must be lead or application`);
        continue;
      }

      const loanPurpose = (row.loan_purpose || "purchase").toLowerCase();
      if (!VALID_LOAN_PURPOSE.has(loanPurpose)) {
        errors.push(`Row ${rowNum}: invalid loan_purpose`);
        continue;
      }

      const exitStrategy = (row.exit_strategy || "sale").toLowerCase();
      if (!VALID_EXIT_STRATEGY.has(exitStrategy)) {
        errors.push(`Row ${rowNum}: invalid exit_strategy`);
        continue;
      }

      const propertyType = (row.property_type || "single_family").toLowerCase();
      if (!VALID_PROPERTY_TYPE.has(propertyType)) {
        errors.push(`Row ${rowNum}: invalid property_type`);
        continue;
      }

      const dayCount = (row.day_count || "actual_360").toLowerCase();
      if (!VALID_DAY_COUNT.has(dayCount)) {
        errors.push(`Row ${rowNum}: day_count must be actual_360 or actual_365`);
        continue;
      }

      const loanAmount = toNumber(row.loan_amount);
      const interestRate = toRate(row.interest_rate);
      const points = toRate(row.points || "");
      const termMonths = Number.parseInt(row.term_months || "", 10);

      if (loanAmount === null || loanAmount <= 0) {
        errors.push(`Row ${rowNum}: loan_amount must be a positive number`);
        continue;
      }
      if (interestRate === null || interestRate <= 0) {
        errors.push(`Row ${rowNum}: interest_rate must be a positive number`);
        continue;
      }
      if (!Number.isFinite(termMonths) || termMonths < 1) {
        errors.push(`Row ${rowNum}: term_months must be a positive integer`);
        continue;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          address_street: row.address_street,
          address_city: row.address_city,
          address_state: state,
          address_zip: row.address_zip,
          property_type: propertyType,
          purchase_price: toNumber(row.purchase_price || ""),
          as_is_value: toNumber(row.as_is_value || ""),
          after_repair_value: toNumber(row.after_repair_value || ""),
          rehab_budget: toNumber(row.rehab_budget || ""),
        })
        .select("id")
        .single();
      if (propertyError || !property) {
        errors.push(`Row ${rowNum}: property insert failed (${propertyError?.message || "error"})`);
        continue;
      }
      propertyId = property.id;

      const borrowerPayload: Record<string, unknown> = {
        borrower_type: borrowerType,
        email: row.borrower_email || row.email || null,
        phone: row.borrower_phone || row.phone || null,
        deals_completed: Number.parseInt(row.deals_completed || "0", 10) || 0,
      };
      if (borrowerType === "individual") {
        borrowerPayload.first_name = row.first_name;
        borrowerPayload.last_name = row.last_name;
      } else {
        borrowerPayload.entity_name = row.entity_name;
        borrowerPayload.formation_state = row.formation_state || null;
      }

      const { data: borrower, error: borrowerError } = await supabase
        .from("borrowers")
        .insert(borrowerPayload)
        .select("id")
        .single();
      if (borrowerError || !borrower) {
        errors.push(`Row ${rowNum}: borrower insert failed (${borrowerError?.message || "error"})`);
        if (propertyId) {
          await supabase.from("properties").delete().eq("id", propertyId);
        }
        continue;
      }
      borrowerId = borrower.id;

      const { data: loan, error: loanError } = await supabase
        .from("loans")
        .insert({
          property_id: property.id,
          status,
          loan_purpose: loanPurpose,
          exit_strategy: exitStrategy,
          loan_amount: loanAmount,
          current_principal: loanAmount,
          interest_rate: interestRate,
          points,
          day_count: dayCount,
          term_months: termMonths,
          origination_date: row.origination_date || null,
          funded_date: row.funded_date || null,
          maturity_date: row.maturity_date || null,
          loan_officer_id: caller.userId,
        })
        .select("id")
        .single();
      if (loanError || !loan) {
        errors.push(`Row ${rowNum}: loan insert failed (${loanError?.message || "error"})`);
        if (borrowerId) {
          await supabase.from("borrowers").delete().eq("id", borrowerId);
        }
        if (propertyId) {
          await supabase.from("properties").delete().eq("id", propertyId);
        }
        continue;
      }
      loanId = loan.id;

      const { error: linkError } = await supabase.from("loan_borrowers").insert({
        loan_id: loan.id,
        borrower_id: borrower.id,
        is_primary: true,
      });
      if (linkError) {
        errors.push(`Row ${rowNum}: loan-borrower link failed (${linkError.message})`);
        if (loanId) {
          await supabase.from("loans").delete().eq("id", loanId);
        }
        if (borrowerId) {
          await supabase.from("borrowers").delete().eq("id", borrowerId);
        }
        if (propertyId) {
          await supabase.from("properties").delete().eq("id", propertyId);
        }
        continue;
      }

      await supabase.from("audit_log").insert({
        table_name: "loans",
        record_id: loan.id,
        action: "insert",
        new_values: { status, loan_amount: loanAmount, source: "csv_import" },
        performed_by: caller.userId,
      });
      imported++;
    }

    const failed = parsed.rows.length - imported;
    revalidatePath("/admin/loans");
    revalidatePath("/admin");

    if (imported === 0) {
      return {
        ok: false,
        message: "No loans were imported.",
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
          ? `Imported ${imported} loan${imported === 1 ? "" : "s"}.`
          : `Imported ${imported} loans with ${failed} row error${failed === 1 ? "" : "s"}.`,
      processed: parsed.rows.length,
      imported,
      failed,
      errors,
    };
  } catch (error) {
    return {
      ...emptyResult(),
      message: error instanceof Error ? error.message : "Loan import failed",
    };
  }
}
