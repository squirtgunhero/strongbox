import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "@/components/portal-nav";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Staff don't belong in the borrower portal
  if (profile.role === "admin" || profile.role === "loan_officer") {
    redirect("/admin");
  }

  const { count: unread } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);

  return (
    <div className="no-serif flex min-h-screen flex-col">
      <header className="relative border-b">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-3">
            <Wordmark height={22} className="text-foreground" />
            <span className="hidden border-l pl-3 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
              Borrower portal
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <PortalNav unreadCount={unread || 0} />
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-9">
        {children}
      </main>
    </div>
  );
}
