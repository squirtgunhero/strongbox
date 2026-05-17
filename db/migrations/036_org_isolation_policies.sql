-- Phase 0 (multi-org retrofit): RESTRICTIVE org-isolation policies.
--
-- Postgres ANDs RESTRICTIVE policies with the existing PERMISSIVE
-- (role-based) policies. This enforces the organization boundary on top of
-- all 63 existing policies WITHOUT modifying any of them -- including the
-- unbounded is_staff()/is_admin() "manage all" policies, which would
-- otherwise span organizations.
--
-- The service role bypasses RLS entirely, so these policies do not
-- constrain it; that path is guarded separately (enforce_org_id trigger
-- in 035 + mandatory orgId in the admin-client wrappers).

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','properties','borrowers','loans','loan_borrowers','payments',
    'audit_log','loan_notes','loan_documents','loan_conditions',
    'condition_templates','draws','draw_line_items','draw_approvals',
    'signature_requests','property_documents','investors',
    'investor_positions','investor_distributions','payment_intents',
    'notifications','org_settings'
  ]
  loop
    execute format(
      'create policy org_isolation on %I
         as restrictive
         for all
         using (org_id = current_org_id())
         with check (org_id = current_org_id())', tbl);
  end loop;
end $$;

-- Storage: objects in the loan-documents bucket are pathed
-- {loan_id}/{filename}. Existing object paths do NOT need to be rewritten;
-- org ownership is enforced via the owning loan's org_id. The bucket
-- carve-out keeps any future bucket unaffected by this restrictive policy.
create policy "org_isolation_loan_documents"
  on storage.objects
  as restrictive
  for all
  using (
    bucket_id <> 'loan-documents'
    or exists (
      select 1 from loans l
      where l.id::text = (string_to_array(name, '/'))[1]
        and l.org_id = current_org_id()
    )
  )
  with check (
    bucket_id <> 'loan-documents'
    or exists (
      select 1 from loans l
      where l.id::text = (string_to_array(name, '/'))[1]
        and l.org_id = current_org_id()
    )
  );
