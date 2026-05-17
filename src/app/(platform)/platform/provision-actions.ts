"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import {
  createUnscopedAdminClient,
  createOrgAdminClient,
} from "@/lib/supabase/admin";
import { getAppBaseUrl, selfHostedRecoveryUrl } from "@/lib/app-url";
import { inviteEmailTemplate } from "@/lib/emails/templates";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * Provision a new lending-shop organization and seed its first admin.
 *
 * Cross-org control-plane operation: the org row is created with the
 * unscoped service client (no org exists yet), then everything written
 * INTO the new org (profile, notification, audit) goes through an
 * org-scoped client so org_id is stamped and the enforce_org_id trigger is
 * satisfied. Platform-originated audit rows use performed_by = NULL with
 * the actor recorded in new_values (the super-admin has no profiles row,
 * and audit_log.performed_by references profiles).
 */
export async function provisionOrg(formData: FormData) {
  const caller = await requirePlatformAdmin();

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase();
  const adminEmail = String(formData.get("admin_email") || "")
    .trim()
    .toLowerCase();
  const adminName = String(formData.get("admin_name") || "").trim();

  if (!name) throw new Error("Organization name is required");
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "Slug must be lowercase letters/numbers/hyphens, 1–50 chars, no leading/trailing hyphen"
    );
  }
  if (!adminEmail) throw new Error("First admin email is required");
  if (!adminName) throw new Error("First admin name is required");

  const unscoped = createUnscopedAdminClient();
  if (!unscoped) {
    throw new Error("Service role not configured (SUPABASE_SERVICE_ROLE_KEY)");
  }

  // 1. Create the organization row.
  const { data: org, error: orgErr } = await unscoped
    .from("organizations")
    .insert({ name, slug })
    .select("id, name, slug")
    .single();
  if (orgErr) {
    if (orgErr.code === "23505") {
      throw new Error(`Slug "${slug}" is already taken`);
    }
    throw new Error(`Failed to create organization: ${orgErr.message}`);
  }

  // 2. Create (or reuse) the auth user for the first admin.
  let adminUserId: string | undefined;
  const { data: created, error: createErr } =
    await unscoped.auth.admin.createUser({
      email: adminEmail,
      email_confirm: false,
      user_metadata: { role: "admin" },
    });
  if (createErr) {
    const { data: list } = await unscoped.auth.admin.listUsers();
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === adminEmail
    );
    if (!existing) {
      throw new Error(`Failed to create first admin: ${createErr.message}`);
    }
    adminUserId = existing.id;
  } else {
    adminUserId = created?.user?.id;
  }
  if (!adminUserId) throw new Error("Failed to resolve first admin user");

  // 3. Build the self-hosted set-password link.
  const appBase = await getAppBaseUrl();
  const { data: linkData, error: linkErr } =
    await unscoped.auth.admin.generateLink({
      type: "recovery",
      email: adminEmail,
      options: { redirectTo: `${appBase}/reset-password` },
    });
  if (linkErr) throw new Error(linkErr.message);
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Invite did not return a token");
  const actionLink = selfHostedRecoveryUrl(appBase, tokenHash);

  // 4. Everything into the new org goes through the org-scoped client.
  const orgClient = createOrgAdminClient(org.id);
  if (!orgClient) {
    throw new Error("Service role not configured");
  }

  await orgClient.from("profiles").upsert({
    id: adminUserId,
    role: "admin",
    full_name: adminName,
    email: adminEmail,
  });

  // 5. Send the branded invite (best-effort) and log it.
  const tpl = inviteEmailTemplate({
    recipientName: adminName,
    role: "admin",
    inviteUrl: actionLink,
    orgName: name,
  });

  let emailStatus = "pending";
  let emailError: string | null = null;
  let providerId: string | null = null;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data: sendData, error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: adminEmail,
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

  await orgClient.from("notifications").insert({
    channel: "email",
    status: emailStatus,
    recipient_email: adminEmail,
    recipient_user_id: adminUserId,
    subject: tpl.subject,
    body: tpl.text,
    event_type: "org.provisioned",
    sent_at: emailStatus === "sent" ? new Date().toISOString() : null,
    failure_reason: emailError,
    provider_message_id: providerId,
  });

  // 6. Audit (org-scoped; platform actor recorded in new_values).
  await orgClient.from("audit_log").insert({
    table_name: "organizations",
    record_id: org.id,
    action: "insert",
    new_values: {
      name,
      slug,
      first_admin_email: adminEmail,
      actor: { platform_admin: caller.userId, email: caller.email },
    },
    performed_by: null,
  });

  revalidatePath("/platform");
}
