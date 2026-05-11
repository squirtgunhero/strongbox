-- Phase polish: notification log
-- Stubs out the queue that real email (Resend) and SMS (Twilio) would consume.

create type notification_channel as enum ('email', 'sms', 'in_app');
create type notification_status as enum ('pending', 'sent', 'failed', 'skipped');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  channel notification_channel not null default 'email',
  status notification_status not null default 'pending',
  recipient_email text,
  recipient_phone text,
  recipient_user_id uuid references profiles(id),
  subject text not null,
  body text not null,
  event_type text, -- e.g. 'payment.recorded', 'draw.approved', 'loan.funded'
  related_loan_id uuid references loans(id) on delete set null,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index idx_notifications_status on notifications(status, created_at);
create index idx_notifications_loan on notifications(related_loan_id);
create index idx_notifications_user on notifications(recipient_user_id);

alter table notifications enable row level security;

create policy "Staff can manage notifications"
  on notifications for all
  using (is_staff());

create policy "Users can view own notifications"
  on notifications for select
  using (recipient_user_id = auth.uid());
