import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  insert: "outline",
  update: "secondary",
  status_change: "secondary",
  access: "outline",
  disbursement: "default",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page || "1");
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  // Admin only
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!profile || profile.role !== "admin") {
    redirect("/admin");
  }

  const { data: entries, count } = await supabase
    .from("audit_log")
    .select(
      `
      *,
      performer:profiles!audit_log_performed_by_fkey(full_name, role)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only history of state changes, document access, and disbursements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Entries ({count?.toLocaleString() || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!entries?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No audit entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.performer?.full_name || (
                        <span className="text-muted-foreground">system</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[e.action] || "outline"}>
                        {e.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {e.table_name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {e.record_id?.slice(0, 8) || "--"}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-md truncate">
                      {e.new_values ? JSON.stringify(e.new_values) : "--"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`?page=${page - 1}`}
                    className="text-sm hover:underline"
                  >
                    ← Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`?page=${page + 1}`}
                    className="text-sm hover:underline"
                  >
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
