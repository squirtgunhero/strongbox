import Link from "next/link";
import { requirePlatformAdminOrEnrollMfa } from "@/lib/auth/require-platform-admin";
import { createUnscopedAdminClient } from "@/lib/supabase/admin";
import { provisionOrg } from "./provision-actions";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export default async function PlatformDashboard() {
  // Defense in depth: the layout already gated this, but every /platform
  // server entrypoint re-checks before touching the service-role client.
  await requirePlatformAdminOrEnrollMfa();

  const admin = createUnscopedAdminClient();
  if (!admin) {
    return <p>Service role not configured (SUPABASE_SERVICE_ROLE_KEY).</p>;
  }

  // Listing every organization is an inherently cross-org control-plane
  // read, so the unscoped service-role client is correct here.
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1>Organizations</h1>
      {error && <p style={{ color: "#b91c1c" }}>Failed to load: {error.message}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Slug</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {(orgs as OrgRow[] | null)?.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 8 }}>
                <Link
                  href={`/platform/orgs/${o.id}`}
                  style={{ color: "#2563eb" }}
                >
                  {o.name}
                </Link>
              </td>
              <td style={{ padding: 8 }}>{o.slug}</td>
              <td style={{ padding: 8 }}>{o.status}</td>
              <td style={{ padding: 8 }}>
                {new Date(o.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {(!orgs || orgs.length === 0) && (
            <tr>
              <td colSpan={4} style={{ padding: 8, color: "#6b7280" }}>
                No organizations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <section style={{ marginTop: 40 }}>
        <h2>Provision a new organization</h2>
        <form
          action={provisionOrg}
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 480,
            marginTop: 12,
          }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            Organization name
            <input name="name" required style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            Slug (lowercase, hyphens)
            <input
              name="slug"
              required
              pattern="[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            First admin name
            <input name="admin_name" required style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            First admin email
            <input
              name="admin_email"
              type="email"
              required
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              justifySelf: "start",
            }}
          >
            Provision organization
          </button>
        </form>
        <p style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>
          Per-org management (suspend/reactivate) and cross-org data access
          land in the next step.
        </p>
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  font: "inherit",
};
