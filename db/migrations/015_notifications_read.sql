-- Add read tracking to notifications
alter table notifications
  add column if not exists read_at timestamptz;

create index if not exists idx_notifications_user_read
  on notifications(recipient_user_id, read_at);

-- Allow recipients to mark their own notifications as read
create policy "Users can update read state on own notifications"
  on notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());
