"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-staff";
import { queueNotification } from "@/lib/notifications";
import {
  inviteEmailTemplate,
  passwordResetEmailTemplate,
} from "@/lib/emails/templates";
import type { UserRole } from "@/lib/types";

/**
 * Resolve the deployed app URL for invite/reset redirects.
 * Mirrors the helper in invite-actions.ts — kept colocated so this module
 * doesn't depend on the borrower invite file (different feature surface).
 */
function getAppBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!configured) {
    throw new Error(
      "Missing app URL configuration. Set NEXT_PUBLIC_APP_URL (recommended) so invite/reset links point to the deployed site."
    );
  }
  const withProtocol = configured.startsWith("http")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}

async function loadOrgName(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data } = await supabase
    .from("org_settings")
    .select("org_name")
    .eq("id", 1)
    .single();
  return data?.org_name || "StrongBox";
}

function requireAdminClient() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in env and redeploy."
    );
  }
  return admin;
}

const STAFF_ROLES: UserRole[] = ["admin", "loan_officer"];

export async function inviteStaff(formData: FormData) {
  const caller = await requireAdmin();
  const admin = requireAdminClient();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "") as UserRole;

  if (!fullName) throw new Error("Full name is required");
  if (!email) throw new Error("Email is required");
  if (!STAFF_ROLES.includes(role)) {
    throw new Error("Role must be admin or loan_officer");
  }

  const redirectTo = `${getAppBaseUrl()}/reset-password`;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo, data: { role } },
    });
  if (linkError) throw new Error(linkError.message);
  const invitedUser = linkData?.user;
  const actionLink = linkData?.properties?.action_link;
  if (!invitedUser || !actionLink) throw new Error("Invite did not return a user");

  await admin.from("profiles").upsert({
    id: invitedUser.id,
    role,
    full_name: fullName,
    email,
  });

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: invitedUser.id,
    action: "insert",
    new_values: { invited_email: email, role },
    performed_by: caller.userId,
  });

  const orgName = await loadOrgName(supabase);
  const tpl = inviteEmailTemplate({
    recipientName: fullName,
    role,
    inviteUrl: actionLink,
    orgName,
  });
  await queueNotification(supabase, {
    recipientEmail: email,
    recipientUserId: invitedUser.id,
    subject: tpl.subject,
    body: tpl.text,
    html: tpl.html,
    eventType: "user.invited",
  });

  revalidatePath("/admin/users");
  return { email };
}

export async function changeUserRole(userId: string, newRole: UserRole) {
  const caller = await requireAdmin();
  if (caller.userId === userId) {
    throw new Error("You cannot change your own role");
  }
  const admin = requireAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", userId)
    .single();
  if (!target) throw new Error("User not found");

  const current = target.role as UserRole;
  const isStaffTransition =
    STAFF_ROLES.includes(current) && STAFF_ROLES.includes(newRole);
  if (!isStaffTransition) {
    // Borrower/investor identity is FK-linked from borrowers/investors tables.
    // Flipping their role here would create dangling references and grant
    // unintended access to staff surfaces.
    throw new Error(
      "Only admin ↔ loan_officer transitions are allowed. Borrower and investor roles must be managed from their respective records."
    );
  }
  if (current === newRole) {
    return { ok: true };
  }

  // Last-admin guard: refuse to demote the last remaining admin.
  if (current === "admin" && newRole !== "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      throw new Error("Cannot demote the last remaining admin");
    }
  }

  const { error: updErr } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);
  if (updErr) throw new Error(updErr.message);

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "update",
    old_values: { role: current },
    new_values: { role: newRole },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const caller = await requireAdmin();
  if (caller.userId === userId) {
    throw new Error("You cannot disable your own account");
  }
  const admin = requireAdminClient();

  // 876000h ≈ 100 years; Supabase requires a duration string and uses "none"
  // to clear the ban.
  const ban_duration = disabled ? "876000h" : "none";
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration,
  });
  if (error) throw new Error(error.message);

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "status_change",
    new_values: { disabled },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserMfa(userId: string) {
  const caller = await requireAdmin();
  if (caller.userId === userId) {
    throw new Error("You cannot reset your own MFA from here. Use the security page.");
  }
  const admin = requireAdminClient();

  const { data: factorsData, error: listErr } =
    await admin.auth.admin.mfa.listFactors({ userId });
  if (listErr) throw new Error(listErr.message);

  const factors = factorsData?.factors ?? [];
  let removed = 0;
  for (const f of factors) {
    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({
      userId,
      id: f.id,
    });
    if (delErr) throw new Error(delErr.message);
    removed += 1;
  }

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "update",
    new_values: { mfa_reset: true, factors_removed: removed },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/users");
  return { removed };
}

export async function sendPasswordResetForUser(userId: string) {
  const caller = await requireAdmin();
  const admin = requireAdminClient();
  const supabase = await createClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();
  if (!profile?.email) throw new Error("User has no email on file");

  const redirectTo = `${getAppBaseUrl()}/reset-password`;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: { redirectTo },
    });
  if (linkError) throw new Error(linkError.message);
  const actionLink = linkData?.properties?.action_link;
  if (!actionLink) throw new Error("Reset did not return a link");

  const orgName = await loadOrgName(supabase);
  const tpl = passwordResetEmailTemplate({
    resetUrl: actionLink,
    orgName,
  });
  await queueNotification(supabase, {
    recipientEmail: profile.email,
    recipientUserId: userId,
    subject: tpl.subject,
    body: tpl.text,
    html: tpl.html,
    eventType: "user.password_reset_sent",
  });

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "access",
    new_values: { password_reset_sent: true },
    performed_by: caller.userId,
  });

  return { email: profile.email };
}

export async function resendInvite(userId: string) {
  const caller = await requireAdmin();
  const admin = requireAdminClient();
  const supabase = await createClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", userId)
    .single();
  if (!profile?.email) throw new Error("User has no email on file");

  const { data: authUser, error: authErr } =
    await admin.auth.admin.getUserById(userId);
  if (authErr) throw new Error(authErr.message);
  if (authUser?.user?.last_sign_in_at) {
    throw new Error("User has already signed in — send a password reset instead");
  }

  const redirectTo = `${getAppBaseUrl()}/reset-password`;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email: profile.email,
      options: { redirectTo, data: { role: profile.role } },
    });
  if (linkError) throw new Error(linkError.message);
  const actionLink = linkData?.properties?.action_link;
  if (!actionLink) throw new Error("Invite did not return a link");

  const orgName = await loadOrgName(supabase);
  const tpl = inviteEmailTemplate({
    recipientName: profile.full_name || profile.email,
    role: profile.role as UserRole,
    inviteUrl: actionLink,
    orgName,
  });
  await queueNotification(supabase, {
    recipientEmail: profile.email,
    recipientUserId: userId,
    subject: tpl.subject,
    body: tpl.text,
    html: tpl.html,
    eventType: "user.invited",
  });

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "update",
    new_values: { invite_resent: true },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/users");
  return { email: profile.email };
}
