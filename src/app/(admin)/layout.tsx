import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "loan_officer"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar profile={profile} />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader profile={profile} />
        <main className="flex-1 px-7 pt-6 pb-16 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
