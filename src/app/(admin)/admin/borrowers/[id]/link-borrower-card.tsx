"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Link as LinkIcon } from "lucide-react";
import { linkBorrowerToAuthUser } from "./link-actions";

export function LinkBorrowerCard({
  borrowerId,
  currentUserId,
  linkedProfile,
}: {
  borrowerId: string;
  currentUserId: string | null;
  linkedProfile: { full_name: string; email: string } | null;
}) {
  const [error, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await linkBorrowerToAuthUser(borrowerId, formData);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Portal Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentUserId ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-700">Linked</span>
            </div>
            {linkedProfile && (
              <div className="text-sm">
                <div className="font-medium">{linkedProfile.full_name}</div>
                <div className="text-muted-foreground text-xs">
                  {linkedProfile.email}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This borrower can sign in at <code>/login</code> and access their
              portal.
            </p>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              To grant portal access:
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Create the auth user in the Supabase dashboard</li>
              <li>
                Insert a profile row with <code>role = &apos;borrower&apos;</code>
              </li>
              <li>Paste the user&apos;s UUID below</li>
            </ol>
            <div className="space-y-2">
              <Label htmlFor="user_id">Auth User UUID</Label>
              <Input
                id="user_id"
                name="user_id"
                placeholder="00000000-0000-0000-0000-000000000000"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Linking..." : "Link Account"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
