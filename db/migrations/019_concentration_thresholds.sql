-- Configurable concentration thresholds for risk alerts.
-- These trigger dashboard warnings when one borrower, state, or property type
-- represents more than the configured % of deployed capital.

alter table org_settings
  add column if not exists max_borrower_concentration numeric(5,4) not null default 0.20,
  add column if not exists max_state_concentration numeric(5,4) not null default 0.40;
