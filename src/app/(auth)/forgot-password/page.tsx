"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const redirectBase = appUrl || window.location.origin;
    const redirectTo = `${redirectBase}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.018em] leading-[1.2]">
          Reset your password
        </h1>
        <p className="text-[13px] text-muted-foreground">
          We&apos;ll email you a secure link to set a new password.
        </p>
      </header>

      {sent ? (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/40 px-4 py-4 text-[13px]">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <MailCheck className="h-4 w-4 text-[color:var(--status-success)]" />
            Check your inbox
          </div>
          <p className="text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>,
            you&apos;ll receive a reset email shortly. Check spam if it
            doesn&apos;t arrive in a few minutes.
          </p>
          <Link
            href="/login"
            className="text-[12.5px] font-medium text-foreground hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              autoComplete="email"
              autoFocus
              required
              className="h-9 rounded-md text-[13.5px]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email}
            className="mt-1 h-10 rounded-md text-[13.5px] font-medium"
          >
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
