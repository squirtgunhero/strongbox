-- 026_notifications_read_rpc.sql
-- Replace the unguarded notifications UPDATE policy with SECURITY DEFINER RPCs
-- that only touch `read_at`. The prior policy allowed a recipient to UPDATE
-- any column on their own notification rows (subject, body, status,
-- provider_message_id, related_loan_id, …) which let them rewrite "Draw
-- disbursed $X" messages or break Resend webhook correlation.

drop policy if exists "Users can update read state on own notifications"
  on notifications;

create or replace function mark_notification_read(notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update notifications
    set read_at = now()
  where id = notification_id
    and recipient_user_id = auth.uid()
    and read_at is null;
end;
$$;

create or replace function mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected int;
begin
  update notifications
    set read_at = now()
  where recipient_user_id = auth.uid()
    and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function mark_notification_read(uuid) to authenticated;
grant execute on function mark_all_notifications_read() to authenticated;

-- Revoke direct UPDATE on notifications from the authenticated role so the
-- only path to mutate them is through the RPCs above.
revoke update on notifications from authenticated;
