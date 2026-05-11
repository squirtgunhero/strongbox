import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function PortalProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: borrower }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("borrowers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} borrower={borrower} />
        </CardContent>
      </Card>
    </div>
  );
}
