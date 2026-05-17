import Link from "next/link";
import { requirePlatformAdminMembership } from "@/lib/auth/require-platform-admin";
import { createClient } from "@/lib/supabase/server";
import { PlatformMfaSetup } from "./mfa-setup";

export const dynamic = "force-dynamic";

/**
 * Platform super-admin MFA enrollment. Membership-gated only (NOT aal2 —
 * this is the page that grants aal2). If the session is already MFA-
 * verified there is nothing to do.
 */
export default async function PlatformMfaPage() {
  await requirePlatformAdminMembership();
  const supabase = await createClient();
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const alreadyVerified = aal?.currentLevel === "aal2";

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Platform console security</h1>
      {alreadyVerified ? (
        <>
          <p>
            Multi-factor authentication is active for this session. You&apos;re
            all set.
          </p>
          <p>
            <Link href="/platform" style={{ color: "#2563eb" }}>
              → Go to the platform console
            </Link>
          </p>
        </>
      ) : (
        <>
          <p>
            The platform console can reach every organization, so multi-factor
            authentication is required before you can use it. Set it up once
            below.
          </p>
          <PlatformMfaSetup />
        </>
      )}
    </div>
  );
}
