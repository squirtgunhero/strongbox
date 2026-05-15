#!/usr/bin/env npx tsx
/**
 * Restore a StrongBox backup from Cloudflare R2.
 *
 * Usage:
 *   npx tsx scripts/restore-backup.ts --date 2026-05-15 --target db [--dry-run]
 *   npx tsx scripts/restore-backup.ts --date 2026-05-15 --target storage [--dry-run]
 *
 * Required env (.env.local):
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   BACKUP_ENCRYPTION_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The DB restore uses INSERT ... ON CONFLICT DO NOTHING via PostgREST
 * upsert(ignoreDuplicates: true) so it is idempotent and safe to re-run.
 */

import { gunzipSync } from "zlib";
import { createClient } from "@supabase/supabase-js";
import { downloadFromR2, listR2Objects, uploadToR2 } from "../src/lib/backup/r2";
import { decryptBuffer } from "../src/lib/backup/encrypt";

type Args = { date?: string; target?: "db" | "storage"; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--date") out.date = args[++i];
    else if (a === "--target") out.target = args[++i] as "db" | "storage";
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function restoreDb(date: string, dryRun: boolean) {
  const key = `db/${date}.sql.gz.enc`;
  console.log(`Downloading ${key} ...`);
  const enc = await downloadFromR2(key);
  const gz = decryptBuffer(enc);
  if (!gz) throw new Error("Decryption failed — wrong key or corrupted file");
  const jsonl = gunzipSync(gz).toString("utf8");
  const lines = jsonl.split("\n").filter(Boolean);

  // First line is metadata
  const meta = JSON.parse(lines[0]);
  console.log("Backup metadata:", meta.meta);

  // Group rows by table
  const byTable = new Map<string, Record<string, unknown>[]>();
  let errors = 0;
  for (let i = 1; i < lines.length; i++) {
    const parsed = JSON.parse(lines[i]);
    if (parsed.error) {
      errors++;
      console.warn("Dump error:", parsed.error);
      continue;
    }
    const { table, row } = parsed as { table: string; row: Record<string, unknown> };
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(row);
  }

  for (const [table, rows] of byTable) {
    console.log(`  ${table}: ${rows.length} rows`);
  }
  if (errors) console.log(`  ${errors} dump errors carried in metadata`);

  if (dryRun) {
    console.log("Dry run — not writing to DB");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Replay in dump order (which respects FK dependencies).
  for (const table of meta.meta.tables as string[]) {
    const rows = byTable.get(table);
    if (!rows || rows.length === 0) continue;
    // Chunk to avoid huge requests
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from(table)
        .upsert(chunk, { ignoreDuplicates: true });
      if (error) {
        console.error(`  ${table}: chunk ${i / CHUNK} failed: ${error.message}`);
      } else {
        inserted += chunk.length;
      }
    }
    console.log(`  ${table}: ${inserted}/${rows.length} replayed`);
  }
}

async function restoreStorage(date: string, dryRun: boolean) {
  // We back storage objects up incrementally without per-day snapshots,
  // so `date` is informational; we list everything under storage/ and
  // optionally re-upload to Supabase.
  void date;
  console.log("Listing all storage/ objects in R2 ...");
  const objects = await listR2Objects("storage/");
  console.log(`Found ${objects.length} objects`);

  if (dryRun) {
    for (const o of objects.slice(0, 50)) {
      console.log(`  ${o.key} (${o.size} bytes)`);
    }
    if (objects.length > 50) console.log(`  ... and ${objects.length - 50} more`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let restored = 0;
  let failed = 0;
  for (const obj of objects) {
    // key format: storage/<bucket>/<path...>
    const m = obj.key.match(/^storage\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const bucket = m[1];
    const path = m[2];
    try {
      const buf = await downloadFromR2(obj.key);
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, buf, { upsert: true });
      if (error) {
        failed++;
        console.error(`  ${obj.key}: ${error.message}`);
      } else {
        restored++;
      }
    } catch (e) {
      failed++;
      console.error(`  ${obj.key}:`, e);
    }
  }
  console.log(`Restored ${restored}, failed ${failed}`);
  // uploadToR2 is unused in storage restore — silence the linter.
  void uploadToR2;
}

async function main() {
  const args = parseArgs();
  if (!args.target) {
    console.error("Usage: --target db|storage --date YYYY-MM-DD [--dry-run]");
    process.exit(1);
  }
  if (args.target === "db" && !args.date) {
    console.error("--date YYYY-MM-DD is required for --target db");
    process.exit(1);
  }
  if (args.target === "db") {
    await restoreDb(args.date!, args.dryRun);
  } else {
    await restoreStorage(args.date || "", args.dryRun);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
