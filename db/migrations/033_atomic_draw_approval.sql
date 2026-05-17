-- Phase 5 hardening: make dual-approval of draws atomic and DB-enforced.
--
-- Problems this fixes:
--   1. approveDraw() read the approval count and then promoted the draw in
--      two separate statements. Two concurrent approvals could both observe
--      count < needed (or promote at the wrong amount). Money state changes
--      cannot have races.
--   2. Threshold was evaluated against the approver-supplied approved_amount,
--      letting an approver under-state the amount to dodge dual approval.
--      The decision amount is now max(requested, approved).
--   3. The requester could be recorded as an approver of their own draw.
--      Now blocked by a trigger, independent of application code.
--
-- SECURITY INVOKER (default): existing RLS on draw_approvals
-- (is_staff() AND approver_id = auth.uid()) and on draws (staff-only update)
-- still applies, so this is defense-in-depth, not a bypass.

-- 1. Hard-block the requester from approving their own draw, on ANY path.
create or replace function reject_requester_self_approval()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from draws d
    where d.id = new.draw_id
      and d.requested_by = new.approver_id
  ) then
    raise exception
      'The person who requested a draw cannot approve it'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_reject_requester_self_approval
  before insert on draw_approvals
  for each row execute function reject_requester_self_approval();

-- 2. Atomic approve: lock the draw, record the approval, and promote in one
--    transaction. Returns the resulting state so the caller can message.
create or replace function approve_draw_atomic(
  p_draw_id uuid,
  p_approved_amount numeric
)
returns table (promoted boolean, approvals integer, approvals_needed integer)
language plpgsql
as $$
declare
  v_draw          draws%rowtype;
  v_threshold     numeric;
  v_decision      numeric;
  v_needed        integer;
  v_count         integer;
begin
  if p_approved_amount is null or p_approved_amount <= 0 then
    raise exception 'Approved amount must be greater than zero'
      using errcode = 'check_violation';
  end if;

  -- Serialize concurrent approvals of the same draw.
  select * into v_draw from draws where id = p_draw_id for update;
  if not found then
    raise exception 'Draw not found' using errcode = 'no_data_found';
  end if;

  if v_draw.status not in ('inspected')
     and not (v_draw.status = 'requested' and v_draw.inspection_required = false)
  then
    raise exception 'Draw must be inspected before approval'
      using errcode = 'check_violation';
  end if;

  -- Record this approval. The unique(draw_id, approver_id) constraint and the
  -- requester-self-approval trigger enforce the separation-of-duties rules.
  insert into draw_approvals (draw_id, approver_id)
  values (p_draw_id, auth.uid());

  select coalesce(dual_approval_threshold, 10000)
    into v_threshold
  from org_settings where id = 1;
  v_threshold := coalesce(v_threshold, 10000);

  -- Bypass-proof: decide on the larger of requested vs approved.
  v_decision := greatest(v_draw.requested_amount, p_approved_amount);
  v_needed   := case when v_decision > v_threshold then 2 else 1 end;

  select count(*) into v_count
  from draw_approvals where draw_id = p_draw_id;

  if v_count >= v_needed then
    update draws
       set status = 'approved',
           approved_amount = p_approved_amount
     where id = p_draw_id;
    promoted := true;
  else
    promoted := false;
  end if;

  approvals := v_count;
  approvals_needed := v_needed;
  return next;
end;
$$;

revoke all on function approve_draw_atomic(uuid, numeric) from public, anon;
grant execute on function approve_draw_atomic(uuid, numeric) to authenticated;
