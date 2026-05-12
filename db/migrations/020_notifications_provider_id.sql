-- Track the provider's message id so webhook events can correlate back
-- to our notifications row.
alter table notifications
  add column if not exists provider_message_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists bounced_at timestamptz;

create index if not exists idx_notifications_provider_msg
  on notifications(provider_message_id);
