-- Pre-existing bug fix (independent of the multi-org work): the backup
-- crons write audit_log rows with action 'backup' / 'backup_rotation', but
-- the action CHECK from 001 only allowed
-- insert/update/status_change/access/disbursement. Those audit inserts have
-- been failing the constraint (so backups produced no audit trail).
--
-- Extend the allowed set. Drop whatever the existing CHECK is named
-- (Postgres auto-names single-column inline checks; do it by lookup so we
-- don't depend on the generated name) and replace it.

do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'audit_log'::regclass and contype = 'c'
  loop
    execute format('alter table audit_log drop constraint %I', c);
  end loop;
end $$;

alter table audit_log
  add constraint audit_log_action_check
  check (action in (
    'insert',
    'update',
    'status_change',
    'access',
    'disbursement',
    'backup',
    'backup_rotation'
  ));
