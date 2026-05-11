-- Optional due date on loan conditions
alter table loan_conditions
  add column if not exists due_date date;
