"use client";

import { useEffect } from "react";

/**
 * Root entry. Normally a bounce to /admin, but Supabase recovery/invite
 * links can land here with the token in the URL hash when the project's
 * Site URL points at the root (e.g. recovery emails). The hash is only
 * visible client-side, so detect it here and forward to /reset-password
 * with the hash intact instead of bouncing to /admin and losing the token.
 */
export default function Home() {
  useEffect(() => {
    const hash = window.location.hash;
    const isAuthCallback =
      hash.includes("access_token=") ||
      hash.includes("type=recovery") ||
      hash.includes("error_description=");
    window.location.replace(
      isAuthCallback ? `/reset-password${hash}` : "/admin"
    );
  }, []);

  return null;
}
