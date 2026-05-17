import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { dumpDatabase } from "@/lib/backup/db-dump";
import { encryptBuffer } from "@/lib/backup/encrypt";
import { uploadToR2 } from "@/lib/backup/r2";
import { PLATFORM_ORG_ID } from "@/lib/platform";

/**
 * Nightly database backup → encrypted JSONL.gz → Cloudflare R2.
 * Schedule: 03:00 UTC daily.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || secret !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return new Response("Service role not configured", { status: 500 });
  }

  const supabase = createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const start = Date.now();
  try {
    const gz = await dumpDatabase(supabase);
    const enc = encryptBuffer(gz);
    const date = new Date().toISOString().split("T")[0];
    const key = `db/${date}.sql.gz.enc`;
    await uploadToR2(key, enc, "application/octet-stream");

    const duration_ms = Date.now() - start;

    await supabase.from("audit_log").insert({
      org_id: PLATFORM_ORG_ID,
      table_name: "system",
      record_id: "00000000-0000-0000-0000-000000000000",
      action: "backup",
      new_values: {
        type: "database",
        key,
        size: enc.length,
        duration_ms,
      },
    });

    return Response.json({ ok: true, key, size: enc.length, duration_ms });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
