import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Edge middleware — enforces MFA on the admin segment when
 * `org_settings.require_mfa_for_staff` is on. Borrower/investor portals
 * intentionally do not enforce MFA at this layer (those users access through
 * Supabase auth; their MFA policy is per-user).
 *
 * The middleware skips:
 *   - the MFA page itself (/admin/security/mfa) so the redirect doesn't loop
 *   - Next.js internals (_next/*, /api/*) and static assets
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce on /admin/*
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  // Don't gate the MFA page itself or auth flows
  if (pathname.startsWith("/admin/security/mfa")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return response; // layout will redirect to /login

  const { data: settings } = await supabase
    .from("org_settings")
    .select("require_mfa_for_staff")
    .eq("id", 1)
    .single();
  if (!settings?.require_mfa_for_staff) return response;

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return response;

  const mfaUrl = request.nextUrl.clone();
  mfaUrl.pathname = "/admin/security/mfa";
  mfaUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(mfaUrl);
}

export const config = {
  // Run on admin pages only — keep middleware light.
  matcher: ["/admin/:path*"],
};
