-- Free-form tags on loans for staff organization.
-- Tags are simple text labels (e.g. "rush", "investor-special", "high-risk").

alter table loans
  add column if not exists tags text[] not null default array[]::text[];

create index if not exists idx_loans_tags on loans using gin (tags);
