-- Function returning a simplified history of a loan, callable by borrower
-- or investor (must have a position) on their own loans.
create or replace function loan_history(loan_id_arg uuid)
returns table (
  created_at timestamptz,
  action text,
  new_values jsonb,
  old_values jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authorize
  if not (
    is_staff()
    or exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loan_id_arg and b.user_id = auth.uid()
    )
    or exists (
      select 1 from investor_positions ip
      join investors i on i.id = ip.investor_id
      where ip.loan_id = loan_id_arg and i.user_id = auth.uid()
    )
  ) then
    raise exception 'Not authorized to view history for this loan';
  end if;

  return query
  select a.created_at, a.action, a.new_values, a.old_values
  from audit_log a
  where a.table_name = 'loans'
    and a.record_id = loan_id_arg
    and a.action in ('insert', 'status_change', 'disbursement')
  order by a.created_at desc
  limit 30;
end;
$$;

grant execute on function loan_history(uuid) to authenticated;
