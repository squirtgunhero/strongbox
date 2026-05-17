import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname.startsWith("/portal");
  const isInvestorRoute = pathname.startsWith("/investor");
  const isDocumentsRoute = pathname.startsWith("/documents");
  const isPlatformRoute = pathname.startsWith("/platform");
  const isLoginRoute = pathname === "/login";
  const isMfaPage = pathname.startsWith("/admin/security/mfa");
  const isProtected =
    isAdminRoute ||
    isPortalRoute ||
    isInvestorRoute ||
    isDocumentsRoute ||
    isPlatformRoute;

  const supabaseUrl = getSupabaseUrl();
  const supabasePublicKey = getSupabasePublicKey();

  if (!supabaseUrl || !supabasePublicKey) {
    console.error(
      "Supabase middleware configuration missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );

    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "auth-config-missing");
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Platform console: only platform_admins may enter. RLS lets a user see
  // only their own platform_admins row, so a hit proves membership. A
  // logged-in non-platform user is bounced to /login (which then routes
  // them to /admin) — deny by default, no privilege info leaked. The
  // route-level requirePlatformAdmin() additionally enforces MFA.
  if (user && isPlatformRoute) {
    const { data: pa } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!pa) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // MFA gate on /admin — if org_settings.require_mfa_for_staff is on and the
  // session is aal1, redirect to /admin/security/mfa for enrollment/challenge.
  // The MFA page itself is skipped to avoid a loop.
  if (user && isAdminRoute && !isMfaPage) {
    // org_settings is one row per organization; the restrictive RLS policy
    // filters it to the caller's org, so no id filter is needed.
    const { data: settings } = await supabase
      .from("org_settings")
      .select("require_mfa_for_staff")
      .single();
    if (settings?.require_mfa_for_staff) {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/security/mfa";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
