import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { TemplateForm } from "./template-form";
import { TemplateRow } from "./template-row";

export default async function ConditionTemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/admin");

  const { data: templates } = await supabase
    .from("condition_templates")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/settings"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Settings
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Condition Templates</h1>
        <p className="text-sm text-muted-foreground">
          Predefined sets of closing conditions you can apply with one click
          from any loan&apos;s conditions checklist.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New Template</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(templates || []).map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {t.name}
                {t.is_builtin && (
                  <Badge variant="outline" className="text-xs">
                    Built-in
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateRow template={t} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
