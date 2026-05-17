import { redirect } from "next/navigation";
import { requirePlatformAdminMembership } from "@/lib/auth/require-platform-admin";

/**
 * Platform console shell. The layout enforces only platform_admin
 * MEMBERSHIP (so the MFA-enrollment page is reachable at aal1). MFA is
 * enforced per sensitive page/action via requirePlatformAdmin /
 * requirePlatformAdminOrEnrollMfa. The super-admin has no org/profile, so
 * this shell is intentionally independent of AdminShell.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;
  try {
    const caller = await requirePlatformAdminMembership();
    email = caller.email;
  } catch {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <strong>StrongBox · Platform Console</strong>
        <span style={{ fontSize: 14, color: "#6b7280" }}>{email}</span>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
