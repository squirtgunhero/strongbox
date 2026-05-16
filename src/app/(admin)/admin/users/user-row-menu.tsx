"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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

  const isStaff = userRole === "admin" || userRole === "loan_officer";

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  function confirmAndRun(prompt: string, fn: () => Promise<unknown>) {
    if (!window.confirm(prompt)) return;
    run(fn);
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
                () => resetUserMfa(userId)
              )
            }
          >
            Reset MFA
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              run(() => sendPasswordResetForUser(userId))
            }
          >
            Send password reset
          </DropdownMenuItem>
          {pendingInvite && (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => run(() => resendInvite(userId))}
            >
              Resend invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {disabled ? (
            <DropdownMenuItem
              disabled={isSelf || pending}
              onClick={() =>
                run(() => setUserDisabled(userId, false))
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
                  () => setUserDisabled(userId, true)
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
                    toast.success(
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
