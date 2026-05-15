import "server-only";

import { gzipSync } from "zlib";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dump the database as a gzipped JSON Lines stream.
 *
 * Layout:
 *   line 1: {"meta": {...}}
 *   then:   {"table": "<name>", "row": {...}}  (one per row)
 *
 * Tables are listed in FK-dependency order so restore can replay top-down.
 * PII columns (ssn_encrypted etc.) are dumped in their already-encrypted
 * form — we are not re-decrypting/re-encrypting them here.
 */

const TABLES = [
  "profiles",
  "org_settings",
  "condition_templates",
  "borrowers",
  "properties",
  "investors",
  "loans",
  "loan_borrowers",
  "loan_conditions",
  "loan_notes",
  "loan_documents",
  "property_documents",
  "payments",
  "draws",
  "draw_line_items",
  "draw_approvals",
  "signature_requests",
  "investor_positions",
  "investor_distributions",
  "notifications",
  "payment_intents",
  "audit_log",
  "rate_limit_attempts",
] as const;

export const BACKUP_TABLES = TABLES;

export async function dumpDatabase(
  supabase: SupabaseClient
): Promise<Buffer> {
  const lines: string[] = [];
  lines.push(
    JSON.stringify({
      meta: {
        version: 1,
        dumped_at: new Date().toISOString(),
        tables: TABLES,
      },
    })
  );

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      // Don't fail the whole dump for one missing/empty table — log the
      // error inline so the restore script can flag it.
      lines.push(
        JSON.stringify({
          error: { table, message: error.message, code: error.code },
        })
      );
      continue;
    }
    for (const row of data || []) {
      lines.push(JSON.stringify({ table, row }));
    }
  }

  const jsonl = lines.join("\n") + "\n";
  return gzipSync(Buffer.from(jsonl, "utf8"));
}
