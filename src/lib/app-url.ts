import { headers } from "next/headers";

/**
 * Resolve the app origin from the actual request host, falling back to env
 * config only if headers are unavailable. Prefer the request host so a
 * stale NEXT_PUBLIC_APP_URL can't embed the wrong domain in invite links.
 *
 * NOTE: equivalent inline copies still exist in admin/users/actions.ts and
 * borrowers/[id]/invite-actions.ts. Those should be migrated to this shared
 * helper as a follow-up (left untouched here to keep this change scoped).
 */
export async function getAppBaseUrl(): Promise<string> {
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
      "Missing app URL configuration. Set NEXT_PUBLIC_APP_URL so invite/reset links point to the deployed site."
    );
  }
  const withProtocol = configured.startsWith("http")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}

/**
 * Build a recovery/invite link that points at our own /reset-password page
 * carrying the single-use token hash (verified there via verifyOtp), so the
 * email never routes through Supabase's hosted verify endpoint.
 */
export function selfHostedRecoveryUrl(
  appBase: string,
  hashedToken: string
): string {
  return `${appBase}/reset-password?token_hash=${encodeURIComponent(
    hashedToken
  )}&type=recovery`;
}
