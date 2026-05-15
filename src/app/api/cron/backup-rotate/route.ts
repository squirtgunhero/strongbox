import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { applyRetention } from "@/lib/backup/retention";

/**
 * Weekly retention pass: prune DB dumps that have aged past the
 * keep window. Schedule: Sunday 04:00 UTC.
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
    const stats = await applyRetention();
    const duration_ms = Date.now() - start;

    await supabase.from("audit_log").insert({
      table_name: "system",
      record_id: "00000000-0000-0000-0000-000000000000",
      action: "backup_rotation",
      new_values: { kept: stats.kept, deleted: stats.deleted, duration_ms },
    });

    return Response.json({ ok: true, ...stats, duration_ms });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
