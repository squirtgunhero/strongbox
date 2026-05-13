-- 027_rate_limits.sql
-- Postgres-backed rate limiter. Lets server-side code (Server Actions, route
-- handlers) enforce per-key throttles without an external Redis dependency.
-- Trade-off: each check is one round-trip — only call it on low-traffic
-- security-sensitive endpoints (auth flows, invite resends, …), never in hot
-- paths.

create table if not exists rate_limit_attempts (
  id bigserial primary key,
  bucket text not null,         -- e.g. 'password_reset'
  key text not null,            -- lowercased email or IP
  occurred_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_bucket_key_time
  on rate_limit_attempts (bucket, key, occurred_at desc);

-- Trim old rows opportunistically — keeps the table from growing forever.
-- Production deployments should also run a periodic vacuum/delete.
create or replace function trim_rate_limit_attempts()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from rate_limit_attempts
    where occurred_at < now() - interval '24 hours';
$$;

-- Record an attempt and return whether it is within the allowed budget.
-- max_attempts attempts per window_seconds for the (bucket,key) pair.
-- Returns true when the new attempt is ALLOWED; false when it was rate-limited.
create or replace function record_rate_limit_attempt(
  p_bucket text,
  p_key text,
  p_max_attempts int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  prior_count int;
begin
  select count(*) into prior_count
    from rate_limit_attempts
    where bucket = p_bucket
      and key = p_key
      and occurred_at > now() - make_interval(secs => p_window_seconds);

  if prior_count >= p_max_attempts then
    return false;
  end if;

  insert into rate_limit_attempts (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

grant execute on function record_rate_limit_attempt(text, text, int, int)
  to service_role;
-- We intentionally do NOT grant to authenticated/anon — the limiter must
-- run via the service-role admin client so anon users can't bypass.
