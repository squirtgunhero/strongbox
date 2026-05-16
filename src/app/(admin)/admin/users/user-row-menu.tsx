"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleChangeDialog } from "./role-change-dialog";
import {
  resetUserMfa,
  sendPasswordResetForUser,
  resendInvite,
  setUserDisabled,
  deleteUser,
} from "./actions";
import type { UserRole } from "@/lib/types";

interface Props {
  userId: string;
  userName: string;
  userRole: UserRole;
  disabled: boolean;
  pendingInvite: boolean;
  isSelf: boolean;
}

export function UserRowMenu({
  userId,
  userName,
  userRole,
  disabled,
  pendingInvite,
  isSelf,
}: Props) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const isStaff = userRole === "admin" || userRole === "loan_officer";

  function run(fn: () => Promise<unknown>, successMsg?: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await fn();
        if (successMsg) setMessage(successMsg);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  function confirmAndRun(prompt: string, fn: () => Promise<unknown>, successMsg?: string) {
    if (!window.confirm(prompt)) return;
    run(fn, successMsg);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="User actions"
              disabled={isSelf}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!isStaff || isSelf || pending}
            onClick={() => setRoleDialogOpen(true)}
          >
            Change role
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSelf || pending}
            onClick={() =>
              confirmAndRun(
                `Reset MFA for ${userName}? They'll need to re-enroll on next sign-in.`,
                () => resetUserMfa(userId),
                "MFA reset."
              )
            }
          >
            Reset MFA
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              run(() => sendPasswordResetForUser(userId), "Password reset sent.")
            }
          >
            Send password reset
          </DropdownMenuItem>
          {pendingInvite && (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => run(() => resendInvite(userId), "Invite resent.")}
            >
              Resend invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {disabled ? (
            <DropdownMenuItem
              disabled={isSelf || pending}
              onClick={() =>
                run(() => setUserDisabled(userId, false), "Account enabled.")
              }
            >
              Enable account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf || pending}
              onClick={() =>
                confirmAndRun(
                  `Disable ${userName}? They will be signed out and unable to log back in.`,
                  () => setUserDisabled(userId, true),
                  "Account disabled."
                )
              }
            >
              Disable account
            </DropdownMenuItem>
          )}
          {isStaff && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isSelf || pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Delete ${userName}? This permanently revokes their access and cannot be undone. If they have account history, their profile is anonymized instead of fully removed.`
                    )
                  )
                    return;
                  run(async () => {
                    const { mode } = await deleteUser(userId);
                    setMessage(
                      mode === "hard"
                        ? "User permanently deleted."
                        : "User had account history — access revoked and profile anonymized."
                    );
                  });
                }}
              >
                Delete user
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <div className="absolute right-2 mt-1 text-[11px] text-muted-foreground">
          {message}
        </div>
      )}
      {isStaff && (userRole === "admin" || userRole === "loan_officer") && (
        <RoleChangeDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          userId={userId}
          userName={userName}
          currentRole={userRole}
        />
      )}
    </>
  );
}
