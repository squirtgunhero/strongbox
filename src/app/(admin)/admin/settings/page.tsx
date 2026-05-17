import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { ChevronRight } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!profile || profile.role !== "admin") {
    redirect("/admin");
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("*")
    .single();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure org-wide settings, licensure, and policy thresholds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Organization & Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Link href="/admin/settings/condition-templates" className="block">
        <Card className="hover:bg-muted/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Condition Templates</CardTitle>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage prebuilt condition sets staff can apply with one click
              when underwriting a new loan.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
