import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdminOrEnrollMfa } from "@/lib/auth/require-platform-admin";
import {
  createUnscopedAdminClient,
  createOrgAdminClient,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Read-only support view of a single organization for the platform
 * super-admin. There are deliberately NO mutating controls here — support
 * mode is observe-only in v1. Every load writes an audited access row into
 * the target org (performed_by NULL since the super-admin has no profile;
 * the platform actor is recorded in new_values).
 */
export default async function OrgSupportView({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const caller = await requirePlatformAdminOrEnrollMfa();
  const { orgId } = await params;

  const unscoped = createUnscopedAdminClient();
  if (!unscoped) return <p>Service role not configured.</p>;

  // organizations is not an org-scoped table; fetch the registry row directly.
  const { data: org } = await unscoped
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) notFound();

  const scoped = createOrgAdminClient(orgId);
  if (!scoped) return <p>Service role not configured.</p>;

  // Record the support access in the target org's audit trail BEFORE
  // showing anything. Append-only; action 'access' is an allowed enum.
  await scoped.from("audit_log").insert({
    table_name: "support_session",
    record_id: orgId,
    action: "access",
    new_values: {
      actor: { platform_admin: caller.userId, email: caller.email },
      view: "org_support_overview",
    },
    performed_by: null,
  });

  // Read-only summary, all via the org-scoped client (so this can only ever
  // surface THIS org's data, never another's).
  const [loans, borrowers, profiles] = await Promise.all([
    scoped
      .from("loans")
      .select("id, status, loan_amount, current_principal", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(25),
    scoped.from("borrowers").select("id", { count: "exact", head: true }),
    scoped
      .from("profiles")
      .select("id, full_name, email, role")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const loanRows =
    (loans.data as
      | {
          id: string;
          status: string;
          loan_amount: number;
          current_principal: number;
        }[]
      | null) ?? [];
  const userRows =
    (profiles.data as
      | { id: string; full_name: string | null; email: string | null; role: string }[]
      | null) ?? [];

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        <Link href="/platform" style={{ color: "#2563eb" }}>
          ← All organizations
        </Link>
      </p>
      <h1>
        {org.name}{" "}
        <span style={{ fontSize: 14, color: "#6b7280" }}>({org.slug})</span>
      </h1>
      <p
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: 999,
          fontSize: 12,
          background: "#fef3c7",
          color: "#92400e",
          marginBottom: 16,
        }}
      >
        SUPPORT MODE · read-only · this visit is logged to {org.name}&apos;s
        audit trail
      </p>

      <div style={{ display: "flex", gap: 24, margin: "16px 0" }}>
        <Stat label="Loans" value={loans.count ?? loanRows.length} />
        <Stat label="Borrowers" value={borrowers.count ?? 0} />
        <Stat label="Users" value={userRows.length} />
        <Stat label="Status" value={org.status} />
      </div>

      <h2>Recent loans</h2>
      <Table
        head={["Status", "Loan amount", "Current principal"]}
        rows={loanRows.map((l) => [
          l.status,
          `$${Number(l.loan_amount).toLocaleString()}`,
          `$${Number(l.current_principal).toLocaleString()}`,
        ])}
        empty="No loans."
      />

      <h2 style={{ marginTop: 24 }}>Users</h2>
      <Table
        head={["Name", "Email", "Role"]}
        rows={userRows.map((u) => [
          u.full_name || "—",
          u.email || "—",
          u.role,
        ])}
        empty="No users."
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
          {head.map((h) => (
            <th key={h} style={{ padding: 8 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
            {r.map((c, j) => (
              <td key={j} style={{ padding: 8 }}>
                {c}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={head.length}
              style={{ padding: 8, color: "#6b7280" }}
            >
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
