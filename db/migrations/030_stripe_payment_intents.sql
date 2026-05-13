-- 030_stripe_payment_intents.sql
-- Add provider tracking columns so payment_intents can be backed by a real
-- ACH debit through Stripe. Optional — works fine with column nulls when
-- the Stripe adapter is in stub mode.

alter table payment_intents
  add column if not exists provider text,
  add column if not exists provider_intent_id text,
  add column if not exists provider_status text,
  add column if not exists provider_failure_code text,
  add column if not exists confirmed_at timestamptz;

create index if not exists idx_payment_intents_provider_intent_id
  on payment_intents(provider_intent_id)
  where provider_intent_id is not null;
