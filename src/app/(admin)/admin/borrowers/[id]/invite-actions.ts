"use server";

import { createClient } from "@/lib/supabase/server";
import { createOrgAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { borrowerDisplayName } from "@/lib/format";
import { requireStaff } from "@/lib/auth/require-staff";
import { queueNotification } from "@/lib/notifications";
import { inviteEmailTemplate } from "@/lib/emails/templates";
import { getOrgSettings } from "@/lib/org-settings";

async function loadOrgName(supabase: Awaited<ReturnType<typeof createClient>>) {
  // org_settings is one row per org; RLS scopes it to the caller's org.
  const settings = await getOrgSettings(supabase);
  return (settings?.org_name as string) || "StrongBox";
}

/**
 * Resolve the app origin from the actual request host (the domain staff is
 * using), falling back to env config only if headers are unavailable. See
 * the matching helper in admin/users/actions.ts for the rationale.
 */
async function getAppBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
      const proto = h.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
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
 * Build an invite link that points at our own /reset-password page carrying
 * the single-use token hash, verified there via verifyOtp. Keeps the email
 * off Supabase's hosted verify endpoint so it can't bounce to a stale Site
 * URL (the localhost problem).
 */
function selfHostedInviteUrl(appBase: string, hashedToken: string): string {
  return `${appBase}/reset-password?token_hash=${encodeURIComponent(
    hashedToken
  )}&type=invite`;
}

export async function inviteBorrower(borrowerId: string) {
  // SECURITY: must be staff. Without this guard any authenticated user
  // (including borrowers themselves) could link arbitrary auth identities to
  // any borrower record and inherit access to that borrower's PII.
  const caller = await requireStaff();
  const supabase = await createClient();

  // Org-scoped: the invited user inherits the inviter's org (the wrapper
  // stamps org_id on the profile/borrower/audit writes below).
  const admin = createOrgAdminClient(caller.orgId);
  if (!admin) {
    throw new Error(
      "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in env and redeploy to enable email invites."
    );
  }

  // Look up the borrower
  const { data: borrower } = await supabase
    .from("borrowers")
    .select("*")
    .eq("id", borrowerId)
    .single();
  if (!borrower) throw new Error("Borrower not found");
  if (!borrower.email) throw new Error("Borrower has no email on file");
  if (borrower.user_id) throw new Error("Borrower is already linked to a user");

  // Generate the invite link WITHOUT sending Supabase's default email; we'll
  // send a branded version via Resend below.
  const appBase = await getAppBaseUrl();
  const { data: linkData, error: linkError } =
    await admin.raw.auth.admin.generateLink({
      type: "invite",
      email: borrower.email,
      options: {
        redirectTo: `${appBase}/reset-password`,
        data: { role: "borrower" },
      },
    });
  if (linkError) throw new Error(linkError.message);
  const invitedUser = linkData?.user;
  const tokenHash = linkData?.properties?.hashed_token;
  if (!invitedUser || !tokenHash)
    throw new Error("Invite did not return a user");
  const actionLink = selfHostedInviteUrl(appBase, tokenHash);

  const fullName = borrowerDisplayName(borrower);

  // Create the profile row with borrower role
  await admin.from("profiles").upsert({
    id: invitedUser.id,
    role: "borrower",
    full_name: fullName,
    email: borrower.email,
    phone: borrower.phone,
  });

  // Link borrower to the new auth user
  await admin
    .from("borrowers")
    .update({ user_id: invitedUser.id })
    .eq("id", borrowerId);

  await admin.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "update",
    new_values: { invited_email: borrower.email, linked_user_id: invitedUser.id },
    performed_by: caller.userId,
  });

  // Send the branded invite email via Resend (replaces Supabase's default).
  const orgName = await loadOrgName(supabase);
  const tpl = inviteEmailTemplate({
    recipientName: fullName,
    role: "borrower",
    inviteUrl: actionLink,
    orgName,
  });
  await queueNotification(caller.orgId, {
    recipientEmail: borrower.email,
    recipientUserId: invitedUser.id,
    subject: tpl.subject,
    body: tpl.text,
    html: tpl.html,
    eventType: "user.invited",
  });

  revalidatePath(`/admin/borrowers/${borrowerId}`);
  return { email: borrower.email };
}

export async function inviteInvestor(investorId: string) {
  // SECURITY: see inviteBorrower — staff only.
  const caller = await requireStaff();
  const supabase = await createClient();

  // Org-scoped: the invited investor user inherits the inviter's org.
  const admin = createOrgAdminClient(caller.orgId);
  if (!admin) {
    throw new Error(
      "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in env and redeploy to enable email invites."
    );
  }

  const { data: investor } = await supabase
    .from("investors")
    .select("*")
    .eq("id", investorId)
    .single();
  if (!investor) throw new Error("Investor not found");
  if (!investor.email) throw new Error("Investor has no email on file");
  if (investor.user_id) throw new Error("Investor is already linked");

  const appBase = await getAppBaseUrl();
  const { data: linkData, error: linkError } =
    await admin.raw.auth.admin.generateLink({
      type: "invite",
      email: investor.email,
      options: {
        redirectTo: `${appBase}/reset-password`,
        data: { role: "investor" },
      },
    });
  if (linkError) throw new Error(linkError.message);
  const invitedUser = linkData?.user;
  const tokenHash = linkData?.properties?.hashed_token;
  if (!invitedUser || !tokenHash)
    throw new Error("Invite did not return a user");
  const actionLink = selfHostedInviteUrl(appBase, tokenHash);

  const fullName =
    investor.investor_type === "entity"
      ? investor.entity_name
      : investor.full_name;

  await admin.from("profiles").upsert({
    id: invitedUser.id,
    role: "investor",
    full_name: fullName || investor.email,
    email: investor.email,
    phone: investor.phone,
  });

  await admin
    .from("investors")
    .update({ user_id: invitedUser.id })
    .eq("id", investorId);

  await admin.from("audit_log").insert({
    table_name: "investors",
    record_id: investorId,
    action: "update",
    new_values: { invited_email: investor.email, linked_user_id: invitedUser.id },
    performed_by: caller.userId,
  });

  const orgName = await loadOrgName(supabase);
  const tpl = inviteEmailTemplate({
    recipientName: fullName || investor.email,
    role: "investor",
    inviteUrl: actionLink,
    orgName,
  });
  await queueNotification(caller.orgId, {
    recipientEmail: investor.email,
    recipientUserId: invitedUser.id,
    subject: tpl.subject,
    body: tpl.text,
    html: tpl.html,
    eventType: "user.invited",
  });

  revalidatePath(`/admin/investors/${investorId}`);
  return { email: investor.email };
}
