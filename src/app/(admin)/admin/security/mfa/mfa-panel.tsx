"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  currentLevel: "aal1" | "aal2";
  existingFactor: { id: string; status: "verified" | "unverified" } | null;
}

export function MfaPanel({ currentLevel, existingFactor }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already verified for this session
  if (existingFactor?.status === "verified" && currentLevel === "aal2") {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-[color:var(--status-success)]" />
          <div>
            <div className="text-[14px] font-semibold">MFA active</div>
            <div className="text-[12px] text-muted-foreground">
              You&apos;re currently signed in with multi-factor verified.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has a factor enrolled but this session is aal1 — challenge.
  if (existingFactor?.status === "verified" && currentLevel === "aal1") {
    return (
      <ChallengeForm
        factorId={existingFactor.id}
        onSuccess={() => router.refresh()}
      />
    );
  }

  // No factor yet — enroll.
  async function startEnrollment() {
    setError("");
    setBusy(true);
    try {
      // Clean up any orphaned unverified factor first.
      if (existingFactor && existingFactor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: existingFactor.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `StrongBox-${new Date().toISOString()}`,
      });
      if (error) throw error;
      if (!data) throw new Error("No enrollment payload");
      setEnrollment({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setError("");
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      {!enrollment ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[color:var(--status-warning)]" />
            <div>
              <div className="text-[14px] font-semibold">No MFA enrolled</div>
              <div className="text-[12.5px] text-muted-foreground">
                Add a TOTP authenticator app to enable a second factor.
              </div>
            </div>
          </div>
          {error && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
              {error}
            </div>
          )}
          <Button onClick={startEnrollment} disabled={busy} className="self-start">
            {busy ? "Starting…" : "Add authenticator"}
          </Button>
        </div>
      ) : (
        <form onSubmit={verifyEnrollment} className="flex flex-col gap-4">
          <div>
            <div className="text-[13px] font-medium">Scan this code</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Open your authenticator app and scan. Then enter the 6-digit code
              below.
            </p>
          </div>
          {/* Render QR as an <img> to avoid XSS from dangerouslySetInnerHTML.
             Supabase returns either a data: URL or raw SVG string. For raw SVG
             we convert to a data URI so it's rendered as an image, not parsed
             as HTML. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              enrollment.qr.startsWith("data:")
                ? enrollment.qr
                : `data:image/svg+xml;base64,${btoa(enrollment.qr)}`
            }
            alt="MFA QR code"
            className="h-44 w-44 rounded-md border bg-white p-2"
          />
          <div className="mono text-[11.5px] text-muted-foreground">
            Or enter the secret manually:&nbsp;
            <span className="text-foreground">{enrollment.secret}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totp">Verification code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          {error && (
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy || code.length < 6}>
            {busy ? "Verifying…" : "Verify and enable"}
          </Button>
        </form>
      )}
    </div>
  );
}

function ChallengeForm({
  factorId,
  onSuccess,
}: {
  factorId: string;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] flex flex-col gap-4"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-[color:var(--status-info)]" />
        <div>
          <div className="text-[14px] font-semibold">Confirm it&apos;s you</div>
          <div className="text-[12.5px] text-muted-foreground">
            Enter the current 6-digit code from your authenticator.
          </div>
        </div>
      </div>
      <Input
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        required
      />
      {error && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
          {error}
        </div>
      )}
      <Button type="submit" disabled={busy || code.length < 6}>
        {busy ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}
