"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // The recovery token arrives in the URL hash; the Supabase client parses
    // it asynchronously. Check the current session AND subscribe to auth
    // changes so we flip to ready whether the session is already established
    // or gets set a moment later (avoids a stuck "Loading reset session…").
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/login");
  }

  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Has a number", ok: /\d/.test(password) },
    { label: "Passwords match", ok: !!password && password === confirm },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-semibold tracking-[-0.018em] leading-[1.2]">
          Choose a new password
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Make it long enough to be hard to guess.
        </p>
      </header>

      {!ready ? (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-[12.5px] text-muted-foreground">
          Loading reset session…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground"
            >
              New password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoFocus
              required
              className="h-9 rounded-md text-[13.5px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="confirm"
              className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground"
            >
              Confirm password
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              className="h-9 rounded-md text-[13.5px]"
            />
          </div>

          <ul className="flex flex-col gap-1 pt-1">
            {checks.map((c) => (
              <li
                key={c.label}
                className={cn(
                  "flex items-center gap-1.5 text-[11.5px]",
                  c.ok ? "text-[color:var(--status-success)]" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid h-3 w-3 place-items-center rounded-full border",
                    c.ok
                      ? "border-[color:var(--status-success)] bg-[color:var(--status-success)] text-white"
                      : "border-muted-foreground/40"
                  )}
                >
                  {c.ok && <Check className="h-2 w-2" strokeWidth={3} />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !checks.every((c) => c.ok)}
            className="mt-1 h-10 rounded-md bg-foreground text-background text-[13.5px] font-medium hover:bg-foreground/90 disabled:bg-muted-foreground/40"
          >
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
