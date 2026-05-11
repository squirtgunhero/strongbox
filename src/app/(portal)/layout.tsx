import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Landmark } from "lucide-react";
import { PortalNav } from "@/components/portal-nav";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            <span className="font-bold">StrongBox</span>
          </Link>
          <div className="flex items-center gap-4">
            <PortalNav />
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
