-- Atomic, idempotent tailor-credit reservations.
-- Deploy this migration BEFORE the application code that calls the RPCs.
-- Service role executes these functions from /api/tailor.

create table if not exists public.tailor_credit_reservations (
  request_id uuid primary key,
  user_id uuid not null,
  status text not null check (status in ('reserved', 'consumed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tailor_credit_reservations_user_idx
  on public.tailor_credit_reservations (user_id, created_at desc);

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

create or replace function public.consume_tailor_credit(p_request_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing public.tailor_credit_reservations%rowtype;
begin
  select * into existing
  from public.tailor_credit_reservations
  where request_id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if existing.status = 'consumed' then
    return jsonb_build_object('ok', true, 'status', 'consumed', 'idempotent', true);
  end if;

  if existing.status = 'refunded' then
    return jsonb_build_object('ok', false, 'error', 'already_refunded');
  end if;

  update public.tailor_credit_reservations
  set status = 'consumed', updated_at = now()
  where request_id = p_request_id;

  return jsonb_build_object('ok', true, 'status', 'consumed');
end;
$$;

create or replace function public.refund_tailor_credit(p_request_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing public.tailor_credit_reservations%rowtype;
  u public.users%rowtype;
begin
  select * into existing
  from public.tailor_credit_reservations
  where request_id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if existing.status = 'refunded' then
    return jsonb_build_object('ok', true, 'status', 'refunded', 'idempotent', true);
  end if;

  if existing.status = 'consumed' then
    return jsonb_build_object('ok', false, 'error', 'already_consumed');
  end if;

  select * into u from public.users where id = existing.user_id for update;

  if found and coalesce(u.plan, '') <> 'pro' then
    update public.users
    set tailor_count = greatest(coalesce(tailor_count, 0) - 1, 0)
    where id = existing.user_id;
  end if;

  update public.tailor_credit_reservations
  set status = 'refunded', updated_at = now()
  where request_id = p_request_id;

  return jsonb_build_object('ok', true, 'status', 'refunded');
end;
$$;

revoke all on function public.reserve_tailor_credit(uuid, uuid) from public;
revoke all on function public.consume_tailor_credit(uuid) from public;
revoke all on function public.refund_tailor_credit(uuid) from public;

grant execute on function public.reserve_tailor_credit(uuid, uuid) to service_role;
grant execute on function public.consume_tailor_credit(uuid) to service_role;
grant execute on function public.refund_tailor_credit(uuid) to service_role;
