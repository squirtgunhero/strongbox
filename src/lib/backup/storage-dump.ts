import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { headR2Object, uploadToR2 } from "./r2";

/**
 * Incrementally sync every object from every Supabase Storage bucket
 * into R2 under `storage/<bucket>/<path>`. Existing objects of the same
 * size are skipped (R2 is the source of truth for "already backed up").
 *
 * Files >50MB are deferred — we don't want a single upload to blow the
 * cron's 300s budget. They can be handled by a future targeted pass.
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type StorageEntry = { name: string; size: number };

async function listAll(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  // Supabase list() returns at most 100 items by default; bump and paginate.
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error || !data) break;
    if (data.length === 0) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // A "folder" in Supabase Storage has id === null.
      if (item.id === null) {
        const children = await listAll(supabase, bucket, path);
        out.push(...children);
      } else {
        const size =
          (item.metadata as { size?: number } | null)?.size ?? 0;
        out.push({ name: path, size });
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

export async function syncStorageToR2(
  supabase: SupabaseClient
): Promise<{ uploaded: number; skipped: number; failed: number }> {
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  const { data: buckets, error: bucketsErr } =
    await supabase.storage.listBuckets();
  if (bucketsErr || !buckets) {
    return { uploaded, skipped, failed };
  }

  for (const bucket of buckets) {
    const entries = await listAll(supabase, bucket.name, "");
    for (const entry of entries) {
      if (entry.size > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }
      const r2Key = `storage/${bucket.name}/${entry.name}`;
      try {
        const head = await headR2Object(r2Key);
        if (head && head.size === entry.size) {
          skipped++;
          continue;
        }
        const { data: blob, error: dlErr } = await supabase.storage
          .from(bucket.name)
          .download(entry.name);
        if (dlErr || !blob) {
          failed++;
          continue;
        }
        const buf = Buffer.from(await blob.arrayBuffer());
        await uploadToR2(r2Key, buf);
        uploaded++;
      } catch {
        failed++;
      }
    }
  }

  return { uploaded, skipped, failed };
}
