import "server-only";

import { deleteFromR2, listR2Objects } from "./r2";

/**
 * Retention policy for DB dumps (storage objects are append-only):
 *
 *   age <= 30d   → keep all (dailies)
 *   30d < age <= 180d → keep only Sundays (weeklies)
 *   age > 180d   → keep only the 1st of each month (monthlies)
 *
 * DB dump keys look like `db/YYYY-MM-DD.sql.gz.enc`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateFromKey(key: string): Date | null {
  // db/YYYY-MM-DD.sql.gz.enc
  const m = key.match(/^db\/(\d{4})-(\d{2})-(\d{2})\.sql\.gz\.enc$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isNaN(d.getTime()) ? null : d;
}

function shouldKeep(backupDate: Date, now: Date): boolean {
  const ageMs = now.getTime() - backupDate.getTime();
  const ageDays = ageMs / DAY_MS;
  if (ageDays <= 30) return true;
  if (ageDays <= 180) {
    // weekly: keep Sundays (UTC dow === 0)
    return backupDate.getUTCDay() === 0;
  }
  // monthly: keep the 1st
  return backupDate.getUTCDate() === 1;
}

export async function applyRetention(): Promise<{
  kept: number;
  deleted: number;
}> {
  const objects = await listR2Objects("db/");
  const now = new Date();
  let kept = 0;
  let deleted = 0;
  for (const obj of objects) {
    const d = parseDateFromKey(obj.key);
    if (!d) {
      // unrecognized format — leave it alone
      kept++;
      continue;
    }
    if (shouldKeep(d, now)) {
      kept++;
    } else {
      await deleteFromR2(obj.key);
      deleted++;
    }
  }
  return { kept, deleted };
}
