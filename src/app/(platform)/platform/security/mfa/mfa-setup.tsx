"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollPlatformMfa, verifyPlatformMfa } from "./actions";

export function PlatformMfaSetup() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const r = await enrollPlatformMfa();
    setBusy(false);
    if (r.status === "already_verified") {
      router.replace("/platform");
      return;
    }
    if (r.status === "error") {
      setError(r.message);
      return;
    }
    setFactorId(r.factorId);
    setQr(r.qrCode);
    setSecret(r.secret);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const r = await verifyPlatformMfa(factorId, code);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    // Session is now aal2 — go to the console.
    router.replace("/platform");
    router.refresh();
  }

  if (!factorId) {
    return (
      <div>
        <button onClick={start} disabled={busy} style={btn}>
          {busy ? "Starting…" : "Begin MFA setup"}
        </button>
        {error && <p style={errStyle}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <p>
        Scan this QR code in your authenticator app (1Password, Authy, Google
        Authenticator), then enter the 6-digit code to finish.
      </p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt="TOTP QR code"
          width={200}
          height={200}
          style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
      )}
      {secret && (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Or enter this secret manually: <code>{secret}</code>
        </p>
      )}
      <form onSubmit={verify} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            font: "inherit",
            width: 120,
          }}
        />
        <button type="submit" disabled={busy} style={btn}>
          {busy ? "Verifying…" : "Verify & enable"}
        </button>
      </form>
      {error && <p style={errStyle}>{error}</p>}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 16px",
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
const errStyle: React.CSSProperties = { color: "#b91c1c", marginTop: 10 };
