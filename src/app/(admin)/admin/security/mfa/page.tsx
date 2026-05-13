import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaPanel } from "./mfa-panel";

export const dynamic = "force-dynamic";

/**
 * MFA enrollment + challenge page. Three states:
 *   1. No factor enrolled → show enrollment flow (QR + verify code)
 *   2. Factor enrolled but session is aal1 → show challenge flow
 *   3. Factor enrolled and session is aal2 → "you're set" + unenroll option
 *
 * Routed to automatically when org_settings.require_mfa_for_staff is on and
 * a staff member without MFA hits a protected action.
 */
export default async function MfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0] || null;

  const currentLevel: "aal1" | "aal2" =
    aal?.currentLevel === "aal2" ? "aal2" : "aal1";

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1.5">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Security
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.018em]">
          Multi-factor authentication
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Required for staff accounts. Add a TOTP authenticator app (1Password,
          Authy, Google Authenticator) and StrongBox will challenge you on each
          new session.
        </p>
      </header>

      <MfaPanel
        currentLevel={currentLevel}
        existingFactor={
          totp
            ? { id: totp.id, status: totp.status as "verified" | "unverified" }
            : null
        }
      />
    </div>
  );
}
