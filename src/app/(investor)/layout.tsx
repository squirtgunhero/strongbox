import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Landmark, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { InvestorNav } from "@/components/investor-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function InvestorLayout({
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role !== "investor") {
    // Staff → admin, borrowers → portal
    redirect(
      ["admin", "loan_officer"].includes(profile.role) ? "/admin" : "/portal"
    );
  }

  const { count: unread } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/investor" className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            <span className="font-bold">StrongBox</span>
            <span className="text-xs text-muted-foreground ml-2">Investor</span>
          </Link>
          <div className="flex items-center gap-4">
            <InvestorNav unreadCount={unread || 0} />
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="mr-2 h-3 w-3" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
