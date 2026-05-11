-- Performance indexes for audit_log queries

-- Loan timeline: "all audits for table=loans, record_id=X, newest first"
create index if not exists idx_audit_log_record_created
  on audit_log(table_name, record_id, created_at desc);

-- Filter page: action + created_at
create index if not exists idx_audit_log_action_created
  on audit_log(action, created_at desc);

-- Drop old single-purpose index now replaced by composite
drop index if exists idx_audit_log_record;
