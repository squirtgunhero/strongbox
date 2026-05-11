-- Hazard insurance tracking on the loan
alter table loans
  add column if not exists insurance_carrier text,
  add column if not exists insurance_policy_number text,
  add column if not exists insurance_coverage_amount numeric(14,2),
  add column if not exists insurance_expiration_date date,
  add column if not exists insurance_agent_name text,
  add column if not exists insurance_agent_email text,
  add column if not exists insurance_agent_phone text,
  add column if not exists insurance_updated_at timestamptz;

-- Borrower insurance updates go through a SECURITY DEFINER function so we
-- can keep loans RLS update-restricted to staff while still letting borrowers
-- write the narrow set of insurance columns on loans they own.
create or replace function update_loan_insurance(
  loan_id_arg uuid,
  carrier_arg text,
  policy_number_arg text,
  coverage_amount_arg numeric,
  expiration_date_arg date,
  agent_name_arg text,
  agent_email_arg text,
  agent_phone_arg text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify the caller is a borrower on this loan (or staff)
  if not (
    is_staff()
    or exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loan_id_arg
      and b.user_id = auth.uid()
    )
  ) then
    raise exception 'Not authorized to update insurance for this loan';
  end if;

  update loans set
    insurance_carrier = carrier_arg,
    insurance_policy_number = policy_number_arg,
    insurance_coverage_amount = coverage_amount_arg,
    insurance_expiration_date = expiration_date_arg,
    insurance_agent_name = agent_name_arg,
    insurance_agent_email = agent_email_arg,
    insurance_agent_phone = agent_phone_arg,
    insurance_updated_at = now()
  where id = loan_id_arg;
end;
$$;

grant execute on function update_loan_insurance to authenticated;
