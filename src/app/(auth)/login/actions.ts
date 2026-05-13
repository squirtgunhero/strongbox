"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";

interface SignInResult {
  ok: boolean;
  /** Destination path. Empty string = stay on /login and show error. */
  redirectTo: string;
  /** Generic message; intentionally vague to avoid user enumeration. */
  error?: string;
}

/**
 * Server-side login proxy. Wraps Supabase password sign-in so we can:
 *   1. Enforce app-side per-email + per-IP rate limits BEFORE hitting
 *      Supabase Auth (which has its own throttle but we want defense in
 *      depth and IP-bucketing).
 *   2. Return a generic error message and resolve the role-based redirect
 *      server-side, removing the client roundtrip that previously fetched
 *      the profile after sign-in.
 *
 * Failed attempts still consume rate-limit tokens for non-existent emails so
 * timing/error differentials don't leak account existence.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, redirectTo: "", error: "Email and password are required" };
  }

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const emailLimit = await rateLimit({
    bucket: "login_email",
    key: normalizedEmail,
    max: 8,
    windowSeconds: 15 * 60,
  });
  if (!emailLimit.allowed) {
    return {
      ok: false,
      redirectTo: "",
      error: "Too many attempts. Try again in a few minutes.",
    };
  }
  const ipLimit = await rateLimit({
    bucket: "login_ip",
    key: ip,
    max: 30,
    windowSeconds: 15 * 60,
  });
  if (!ipLimit.allowed) {
    return {
      ok: false,
      redirectTo: "",
      error: "Too many attempts. Try again in a few minutes.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error || !data?.user) {
    return { ok: false, redirectTo: "", error: "Invalid email or password" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const dest =
    profile?.role === "admin" || profile?.role === "loan_officer"
      ? "/admin"
      : profile?.role === "investor"
        ? "/investor"
        : "/portal";

  return { ok: true, redirectTo: dest };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
