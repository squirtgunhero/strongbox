"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-staff";
import { queueNotification } from "@/lib/notifications";
import { Resend } from "resend";
import {
  inviteEmailTemplate,
  passwordResetEmailTemplate,
} from "@/lib/emails/templates";
import type { UserRole } from "@/lib/types";

/**
 * Resolve the app origin for invite/reset redirect links.
 *
 * Prefer the actual request host (the domain the admin is using) over env
 * vars: a stale/misconfigured NEXT_PUBLIC_APP_URL (e.g. pinned to localhost)
 * would otherwise embed the wrong host in invite links. Falls back to env
 * configuration only if the request headers are unavailable.
 */
async function getAppBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
      const proto = h.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
    // Local dev: trust the request host as-is so links work locally too.
    if (host) {
      const proto = h.get("x-forwarded-proto") || "http";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // headers() unavailable — fall through to env configuration.
  }

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

/**
 * Build a recovery/invite link that points at our own /reset-password page
 * carrying the single-use token hash. The page verifies it directly via
 * verifyOtp, so the email never routes through Supabase's verify endpoint
 * and therefore can't bounce to a stale Auth "Site URL" (e.g. localhost).
 */
function selfHostedRecoveryUrl(appBase: string, hashedToken: string): string {
  return `${appBase}/reset-password?token_hash=${encodeURIComponent(
    hashedToken
  )}&type=recovery`;
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

  const appBase = await getAppBaseUrl();

  // Create user without triggering Supabase's built-in invite email.
  // We send our own branded email via Resend instead.
  let invitedUser: { id: string } | undefined;
  const { data: existing } = await admin.auth.admin.listUsers();
  const existingUser = existing?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existingUser) {
    invitedUser = existingUser;
  } else {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { role },
      });
    if (createError) throw new Error(createError.message);
    invitedUser = created?.user;
  }
  if (!invitedUser) throw new Error("Failed to create user");

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appBase}/reset-password` },
    });
  if (linkError) throw new Error(linkError.message);
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Invite did not return a token");
  const actionLink = selfHostedRecoveryUrl(appBase, tokenHash);

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

  // Send email directly via Resend, log result to notifications table
  let emailStatus = "pending";
  let emailError: string | null = null;
  let providerId: string | null = null;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data: sendData, error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
      if (sendErr) {
        emailStatus = "failed";
        emailError = sendErr.message || String(sendErr);
      } else {
        emailStatus = "sent";
        providerId = sendData?.id || null;
      }
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else {
    emailError = "RESEND_API_KEY not configured";
  }

  await admin.from("notifications").insert({
    channel: "email",
    status: emailStatus,
    recipient_email: email,
    recipient_user_id: invitedUser.id,
    subject: tpl.subject,
    body: tpl.text,
    event_type: "user.invited",
    sent_at: emailStatus === "sent" ? new Date().toISOString() : null,
    failure_reason: emailError,
    provider_message_id: providerId,
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

export async function deleteUser(userId: string) {
  const caller = await requireAdmin();
  if (caller.userId === userId) {
    throw new Error("You cannot delete your own account");
  }
  const admin = requireAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", userId)
    .single();
  if (!target) throw new Error("User not found");

  const role = target.role as UserRole;
  if (!STAFF_ROLES.includes(role)) {
    // Borrower/investor identity is FK-linked from the borrowers/investors
    // tables; deleting here would orphan those records.
    throw new Error(
      "Only staff accounts can be deleted here. Borrower and investor accounts must be removed from their respective records."
    );
  }

  // Last-admin guard: never leave the platform without an admin.
  if (role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      throw new Error("Cannot delete the last remaining admin");
    }
  }

  // Try a full hard delete. Deleting the auth user cascades to profiles
  // (profiles.id references auth.users on delete cascade). If the user has
  // audit history or linked records, that cascaded profile delete is blocked
  // by RESTRICT foreign keys (audit_log.performed_by, loans.loan_officer_id,
  // payments.recorded_by, …) and the whole delete fails atomically — so we
  // fall back to a permanent deactivation that preserves audit integrity:
  // ban the login and anonymize the profile.
  let mode: "hard" | "deactivated" = "hard";
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    mode = "deactivated";
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banErr) throw new Error(banErr.message);
    const tombstone = `deleted+${userId.slice(0, 8)}@deleted.invalid`;
    const { error: scrubErr } = await admin
      .from("profiles")
      .update({ full_name: "Deleted user", email: tombstone })
      .eq("id", userId);
    if (scrubErr) throw new Error(scrubErr.message);
  }

  await admin.from("audit_log").insert({
    table_name: "profiles",
    record_id: userId,
    action: "delete",
    old_values: {
      email: target.email,
      role,
      full_name: target.full_name,
    },
    new_values: { mode },
    performed_by: caller.userId,
  });

  revalidatePath("/admin/users");
  return { mode };
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

  const appBase = await getAppBaseUrl();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: { redirectTo: `${appBase}/reset-password` },
    });
  if (linkError) throw new Error(linkError.message);
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Reset did not return a token");
  const actionLink = selfHostedRecoveryUrl(appBase, tokenHash);

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

  const appBase = await getAppBaseUrl();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: { redirectTo: `${appBase}/reset-password` },
    });
  if (linkError) throw new Error(linkError.message);
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Invite did not return a token");
  const actionLink = selfHostedRecoveryUrl(appBase, tokenHash);

  const orgName = await loadOrgName(supabase);
  const tpl = inviteEmailTemplate({
    recipientName: profile.full_name || profile.email,
    role: profile.role as UserRole,
    inviteUrl: actionLink,
    orgName,
  });

  // Send email directly via Resend
  let emailStatus = "pending";
  let emailError: string | null = null;
  let providerId: string | null = null;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data: sendData, error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: profile.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
      if (sendErr) {
        emailStatus = "failed";
        emailError = sendErr.message || String(sendErr);
      } else {
        emailStatus = "sent";
        providerId = sendData?.id || null;
      }
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else {
    emailError = "RESEND_API_KEY not configured";
  }

  await admin.from("notifications").insert({
    channel: "email",
    status: emailStatus,
    recipient_email: profile.email,
    recipient_user_id: userId,
    subject: tpl.subject,
    body: tpl.text,
    event_type: "user.invited",
    sent_at: emailStatus === "sent" ? new Date().toISOString() : null,
    failure_reason: emailError,
    provider_message_id: providerId,
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
