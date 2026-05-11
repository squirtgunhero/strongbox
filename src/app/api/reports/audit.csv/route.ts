import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/calculations/reports";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  let query = supabase
    .from("audit_log")
    .select(`
      created_at, action, table_name, record_id, new_values, old_values,
      performer:profiles!audit_log_performed_by_fkey(full_name, role)
    `)
    .order("created_at", { ascending: false });

  if (sp.get("action") && sp.get("action") !== "all") {
    query = query.eq("action", sp.get("action")!);
  }
  if (sp.get("table") && sp.get("table") !== "all") {
    query = query.eq("table_name", sp.get("table")!);
  }
  if (sp.get("from")) query = query.gte("created_at", sp.get("from")!);
  if (sp.get("to"))
    query = query.lte("created_at", `${sp.get("to")}T23:59:59.999Z`);

  // Cap at 10k to avoid generating massive files
  const { data } = await query.limit(10000);

  type Row = {
    created_at: string;
    action: string;
    table_name: string;
    record_id: string;
    new_values: unknown;
    old_values: unknown;
    performer: { full_name: string; role: string } | null;
  };

  const rows = ((data || []) as unknown as Row[]).map((r) => ({
    timestamp: r.created_at,
    action: r.action,
    table: r.table_name,
    record_id: r.record_id,
    performed_by: r.performer?.full_name || "system",
    performer_role: r.performer?.role || "",
    new_values: r.new_values ? JSON.stringify(r.new_values) : "",
    old_values: r.old_values ? JSON.stringify(r.old_values) : "",
  }));

  return new Response(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
