"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { borrowerDisplayName } from "@/lib/format";

export async function inviteBorrower(borrowerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
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

  // Use Supabase admin API to invite via email
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`;
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(borrower.email, {
      redirectTo,
      data: { role: "borrower" },
    });
  if (inviteError) throw new Error(inviteError.message);
  if (!invited.user) throw new Error("Invite did not return a user");

  const fullName = borrowerDisplayName(borrower);

  // Create the profile row with borrower role
  await admin.from("profiles").upsert({
    id: invited.user.id,
    role: "borrower",
    full_name: fullName,
    email: borrower.email,
    phone: borrower.phone,
  });

  // Link borrower to the new auth user
  await admin
    .from("borrowers")
    .update({ user_id: invited.user.id })
    .eq("id", borrowerId);

  await admin.from("audit_log").insert({
    table_name: "borrowers",
    record_id: borrowerId,
    action: "update",
    new_values: { invited_email: borrower.email, linked_user_id: invited.user.id },
    performed_by: user.id,
  });

  revalidatePath(`/admin/borrowers/${borrowerId}`);
  return { email: borrower.email };
}

export async function inviteInvestor(investorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
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

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`;
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(investor.email, {
      redirectTo,
      data: { role: "investor" },
    });
  if (inviteError) throw new Error(inviteError.message);
  if (!invited.user) throw new Error("Invite did not return a user");

  const fullName =
    investor.investor_type === "entity"
      ? investor.entity_name
      : investor.full_name;

  await admin.from("profiles").upsert({
    id: invited.user.id,
    role: "investor",
    full_name: fullName || investor.email,
    email: investor.email,
    phone: investor.phone,
  });

  await admin
    .from("investors")
    .update({ user_id: invited.user.id })
    .eq("id", investorId);

  await admin.from("audit_log").insert({
    table_name: "investors",
    record_id: investorId,
    action: "update",
    new_values: { invited_email: investor.email, linked_user_id: invited.user.id },
    performed_by: user.id,
  });

  revalidatePath(`/admin/investors/${investorId}`);
  return { email: investor.email };
}
