"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const dest =
      profile?.role === "admin" || profile?.role === "loan_officer"
        ? "/admin"
        : profile?.role === "investor"
          ? "/investor"
          : "/portal";

    router.push(dest);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-semibold tracking-[-0.018em] leading-[1.2]">
          Sign in
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Access your lending book and servicing queue.
        </p>
      </header>

      <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label
              htmlFor="password"
              className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
          disabled={loading || !email || !password}
          className="mt-1 h-10 rounded-md text-[13.5px] font-medium"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="border-t pt-4 text-center text-[11.5px] text-muted-foreground">
        Don&apos;t have an account?{" "}
        <span className="text-foreground">Contact your administrator</span>
      </div>
    </div>
  );
}
