"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications-read";
import { formatDate } from "@/lib/format";

interface Notification {
  id: string;
  subject: string;
  body: string;
  event_type: string | null;
  created_at: string;
  read_at: string | null;
  related_loan_id: string | null;
}

export function NotificationsInbox({
  notifications,
  loanBasePath,
}: {
  notifications: Notification[];
  loanBasePath: string; // "/portal/loans" or "/investor/loans"
}) {
  const [pending, setPending] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleClick(id: string, alreadyRead: boolean) {
    if (alreadyRead) return;
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    setPending(true);
    try {
      await markAllNotificationsRead();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAll}
            disabled={pending}
          >
            <CheckCheck className="mr-2 h-3 w-3" />
            {pending ? "Marking..." : "Mark all read"}
          </Button>
        )}
      </div>

      {!notifications.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const unread = !n.read_at;
            return (
              <Card
                key={n.id}
                className={unread ? "border-primary/40 bg-primary/5" : ""}
                onClick={() => handleClick(n.id, !unread)}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {unread && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                      {n.subject}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {n.event_type || "notice"}
                  </Badge>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{n.body}</p>
                  {n.related_loan_id && (
                    <Link
                      href={`${loanBasePath}/${n.related_loan_id}`}
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      View loan →
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
