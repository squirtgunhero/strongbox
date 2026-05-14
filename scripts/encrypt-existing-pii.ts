#!/usr/bin/env npx tsx
/**
 * One-time script to encrypt existing plaintext PII values in the database.
 *
 * Prerequisites:
 *   - FIELD_ENCRYPTION_KEY must be set in .env.local (64-char hex, 32 bytes)
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *
 * Usage:
 *   npx tsx scripts/encrypt-existing-pii.ts
 *   npx tsx scripts/encrypt-existing-pii.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const dryRun = process.argv.includes("--dry-run");

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    console.error(
      "FIELD_ENCRYPTION_KEY must be a 64-char hex string. Generate with:"
    );
    console.error(
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
    process.exit(1);
  }
  return Buffer.from(hex, "hex");
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

function tryDecrypt(encoded: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(encoded, "base64");
    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) return null;
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return null;
  }
}

function isAlreadyEncrypted(value: string): boolean {
  return tryDecrypt(value) !== null;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  if (dryRun) console.log("=== DRY RUN — no changes will be written ===\n");

  // --- Borrowers: ssn_encrypted, ein_encrypted ---
  const { data: borrowers, error: bErr } = await supabase
    .from("borrowers")
    .select("id, ssn_encrypted, ein_encrypted");
  if (bErr) {
    console.error("Failed to fetch borrowers:", bErr.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const b of borrowers || []) {
    const patch: Record<string, string> = {};

    if (b.ssn_encrypted && !isAlreadyEncrypted(b.ssn_encrypted)) {
      patch.ssn_encrypted = encrypt(b.ssn_encrypted);
    }
    if (b.ein_encrypted && !isAlreadyEncrypted(b.ein_encrypted)) {
      patch.ein_encrypted = encrypt(b.ein_encrypted);
    }

    if (Object.keys(patch).length > 0) {
      if (dryRun) {
        console.log(`  [borrower ${b.id.slice(0, 8)}] would encrypt: ${Object.keys(patch).join(", ")}`);
      } else {
        const { error } = await supabase
          .from("borrowers")
          .update(patch)
          .eq("id", b.id);
        if (error) {
          console.error(`  [borrower ${b.id.slice(0, 8)}] FAILED:`, error.message);
        } else {
          console.log(`  [borrower ${b.id.slice(0, 8)}] encrypted: ${Object.keys(patch).join(", ")}`);
        }
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nBorrowers: ${updated} encrypted, ${skipped} skipped (null or already encrypted)`);

  // --- Investors: tax_id_encrypted ---
  const { data: investors, error: iErr } = await supabase
    .from("investors")
    .select("id, tax_id_encrypted");
  if (iErr) {
    console.error("Failed to fetch investors:", iErr.message);
    process.exit(1);
  }

  updated = 0;
  skipped = 0;

  for (const inv of investors || []) {
    if (inv.tax_id_encrypted && !isAlreadyEncrypted(inv.tax_id_encrypted)) {
      const encrypted = encrypt(inv.tax_id_encrypted);
      if (dryRun) {
        console.log(`  [investor ${inv.id.slice(0, 8)}] would encrypt: tax_id_encrypted`);
      } else {
        const { error } = await supabase
          .from("investors")
          .update({ tax_id_encrypted: encrypted })
          .eq("id", inv.id);
        if (error) {
          console.error(`  [investor ${inv.id.slice(0, 8)}] FAILED:`, error.message);
        } else {
          console.log(`  [investor ${inv.id.slice(0, 8)}] encrypted: tax_id_encrypted`);
        }
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Investors: ${updated} encrypted, ${skipped} skipped (null or already encrypted)`);
  console.log(dryRun ? "\nDry run complete. Run without --dry-run to apply." : "\nDone.");
}

main();
