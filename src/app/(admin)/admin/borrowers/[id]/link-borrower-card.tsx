"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Link as LinkIcon, Mail } from "lucide-react";
import { linkBorrowerToAuthUser } from "./link-actions";
import { inviteBorrower } from "./invite-actions";
import { toast } from "sonner";

export function LinkBorrowerCard({
  borrowerId,
  currentUserId,
  linkedProfile,
}: {
  borrowerId: string;
  currentUserId: string | null;
  linkedProfile: { full_name: string; email: string } | null;
}) {
  const [linkError, setLinkError] = useState("");
  const [linkPending, setLinkPending] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [showUuid, setShowUuid] = useState(false);

  async function handleLink(formData: FormData) {
    setLinkPending(true);
    setLinkError("");
    try {
      await linkBorrowerToAuthUser(borrowerId, formData);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLinkPending(false);
    }
  }

  async function handleInvite() {
    setInvitePending(true);
    try {
      const result = await inviteBorrower(borrowerId);
      toast.success(`Invite sent to ${result.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInvitePending(false);
    }
  }

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
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Email an invite — Supabase sends a magic link that lets the
                borrower set their own password.
              </p>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={invitePending}
              >
                <Mail className="mr-2 h-3 w-3" />
                {invitePending ? "Sending..." : "Send Invite Email"}
              </Button>
            </div>

            <div className="border-t pt-3">
              {!showUuid ? (
                <button
                  type="button"
                  onClick={() => setShowUuid(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Or link manually with a UUID →
                </button>
              ) : (
                <form action={handleLink} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    For users you&apos;ve already created in Supabase:
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="user_id">Auth User UUID</Label>
                    <Input
                      id="user_id"
                      name="user_id"
                      placeholder="00000000-0000-0000-0000-000000000000"
                      required
                    />
                  </div>
                  {linkError && (
                    <p className="text-sm text-destructive">{linkError}</p>
                  )}
                  <Button type="submit" size="sm" disabled={linkPending}>
                    {linkPending ? "Linking..." : "Link Account"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
