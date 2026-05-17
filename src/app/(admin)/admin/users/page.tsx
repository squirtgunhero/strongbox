import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createOrgAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersFilter } from "./users-filter";
import { InviteStaffForm } from "./invite-staff-form";
import { UserRowMenu } from "./user-row-menu";
import type { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  loan_officer: "Loan officer",
  borrower: "Borrower",
  investor: "Investor",
};

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  loan_officer: "secondary",
  borrower: "outline",
  investor: "outline",
};

function relativeTime(date: string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - d) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type StatusKey = "active" | "disabled" | "pending";

function deriveStatus(
  authUser:
    | {
        last_sign_in_at?: string | null;
        banned_until?: string | null;
        email_confirmed_at?: string | null;
      }
    | undefined
): StatusKey {
  if (!authUser) return "pending";
  const banUntil = authUser.banned_until
    ? new Date(authUser.banned_until).getTime()
    : 0;
  if (banUntil && banUntil > Date.now()) return "disabled";
  if (!authUser.last_sign_in_at && !authUser.email_confirmed_at) return "pending";
  return "active";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();
  if (!callerProfile || callerProfile.role !== "admin") {
    redirect("/admin");
  }

  // Org-scoped: this page lists users; the wrapper constrains the listing
  // to the admin's own org so it can't enumerate other orgs' users.
  const admin = createOrgAdminClient(callerProfile.org_id);
  if (!admin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="rounded-md border bg-muted/30 p-6 text-sm">
          User management requires the SUPABASE_SERVICE_ROLE_KEY environment
          variable. Set it on the server and redeploy.
        </div>
      </div>
    );
  }

  // Load profiles, auth users, and verified MFA factors in parallel.
  const [profilesRes, authUsersRes, mfaRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false }),
    admin.raw.auth.admin.listUsers({ perPage: 1000 }),
    admin.raw
      .schema("auth")
      .from("mfa_factors")
      .select("user_id, status")
      .eq("status", "verified"),
  ]);

  type ProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    created_at: string;
  };
  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const authUsers = authUsersRes.data?.users ?? [];
  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const mfaUserIds = new Set(
    (mfaRes.data ?? []).map((r: { user_id: string }) => r.user_id)
  );

  const search = sp.q?.trim().toLowerCase();
  const roleFilter = sp.role && sp.role !== "all" ? (sp.role as UserRole) : null;
  const statusFilter =
    sp.status && sp.status !== "all" ? (sp.status as StatusKey) : null;

  type Row = {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    status: StatusKey;
    hasMfa: boolean;
    lastSignIn: string | null;
  };

  const rows: Row[] = profiles.map((p) => {
    const au = authById.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name || "",
      email: p.email || au?.email || "",
      role: p.role as UserRole,
      status: deriveStatus(au),
      hasMfa: mfaUserIds.has(p.id),
      lastSignIn: au?.last_sign_in_at ?? null,
    };
  });

  const filtered = rows.filter((r) => {
    if (roleFilter && r.role !== roleFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const hay = `${r.full_name} ${r.email}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts, roles, and access.
          </p>
        </div>
        <InviteStaffForm />
      </div>

      <UsersFilter />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">MFA</TableHead>
              <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No users match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.full_name || (
                      <span className="text-muted-foreground">--</span>
                    )}
                    {r.id === user.id && (
                      <span className="ml-2 text-[10.5px] text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {r.email || "--"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[r.role]}>
                      {ROLE_LABEL[r.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.hasMfa ? (
                      <Check
                        className="h-4 w-4 text-emerald-600"
                        aria-label="MFA enrolled"
                      />
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {relativeTime(r.lastSignIn)}
                  </TableCell>
                  <TableCell>
                    {r.status === "active" && (
                      <Badge variant="outline">Active</Badge>
                    )}
                    {r.status === "disabled" && (
                      <Badge variant="destructive">Disabled</Badge>
                    )}
                    {r.status === "pending" && (
                      <Badge variant="secondary">Pending invite</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRowMenu
                      userId={r.id}
                      userName={r.full_name || r.email || "this user"}
                      userRole={r.role}
                      disabled={r.status === "disabled"}
                      pendingInvite={r.status === "pending"}
                      isSelf={r.id === user.id}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
