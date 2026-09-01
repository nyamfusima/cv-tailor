-- Expired Pro must not receive unlimited tailor credits.
-- plan_expires_at was added in 20260801_add_pro_plan_expiry.sql.

create or replace function public.reserve_tailor_credit(p_user_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing public.tailor_credit_reservations%rowtype;
  u public.users%rowtype;
  now_ts timestamptz := now();
  next_reset timestamptz;
  updated int;
  reuse_refunded boolean := false;
begin
  select * into existing
  from public.tailor_credit_reservations
  where request_id = p_request_id
  for update;

  if found and existing.status <> 'refunded' then
    return jsonb_build_object(
      'ok', true,
      'status', existing.status,
      'idempotent', true
    );
  end if;

  reuse_refunded := found;

  select * into u
  from public.users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if u.plan = 'pro' and (u.plan_expires_at is null or u.plan_expires_at > now_ts) then
    if reuse_refunded then
      update public.tailor_credit_reservations
      set status = 'reserved', updated_at = now_ts
      where request_id = p_request_id;
    else
      insert into public.tailor_credit_reservations (request_id, user_id, status)
      values (p_request_id, p_user_id, 'reserved');
    end if;
    return jsonb_build_object('ok', true, 'status', 'reserved', 'plan', 'pro');
  end if;

  if u.plan = 'pro' then
    return jsonb_build_object('ok', false, 'error', 'no_credits');
  end if;

  if u.tailor_reset_date is null or now_ts >= u.tailor_reset_date then
    next_reset := date_trunc('month', now_ts) + interval '1 month';
    update public.users
    set tailor_count = 1, tailor_reset_date = next_reset
    where id = p_user_id;
    if reuse_refunded then
      update public.tailor_credit_reservations
      set status = 'reserved', updated_at = now_ts
      where request_id = p_request_id;
    else
      insert into public.tailor_credit_reservations (request_id, user_id, status)
      values (p_request_id, p_user_id, 'reserved');
    end if;
    return jsonb_build_object('ok', true, 'status', 'reserved', 'tailorCount', 1);
  end if;

  if coalesce(u.tailor_count, 0) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'no_credits');
  end if;

  update public.users
  set tailor_count = tailor_count + 1
  where id = p_user_id and tailor_count < 3;
  get diagnostics updated = row_count;

  if updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_credits');
  end if;

  if reuse_refunded then
    update public.tailor_credit_reservations
    set status = 'reserved', updated_at = now_ts
    where request_id = p_request_id;
  else
    insert into public.tailor_credit_reservations (request_id, user_id, status)
    values (p_request_id, p_user_id, 'reserved');
  end if;

  return jsonb_build_object('ok', true, 'status', 'reserved');
end;
$$;
