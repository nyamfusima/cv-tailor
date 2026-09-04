-- Atomic Gumroad Pro grants: sale_id idempotency, user_id linkage, credit ledger.
-- Pro Monthly/Yearly is an unlimited entitlement for the billing period
-- (users.plan = 'pro' + plan_expires_at). tailor_count is preserved.

alter table public.confirmed_purchases
  add column if not exists user_id uuid;

create index if not exists confirmed_purchases_user_id_idx
  on public.confirmed_purchases (user_id);

create table if not exists public.pending_purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid,
  plan_type text,
  created_at timestamptz not null default now()
);

alter table public.pending_purchases add column if not exists email text;
alter table public.pending_purchases add column if not exists user_id uuid;
alter table public.pending_purchases add column if not exists plan_type text;
alter table public.pending_purchases add column if not exists created_at timestamptz default now();

delete from public.pending_purchases a
using public.pending_purchases b
where lower(a.email) = lower(b.email)
  and a.ctid < b.ctid;

create unique index if not exists pending_purchases_email_idx
  on public.pending_purchases (email);

create table if not exists public.purchase_credit_grants (
  sale_id text primary key,
  user_id uuid not null,
  account_email text not null,
  plan_type text not null check (plan_type in ('pro_monthly', 'pro_yearly')),
  entitlement text not null check (entitlement in ('unlimited_pro')),
  credits_delta integer not null default 0,
  audit_reason text,
  created_at timestamptz not null default now()
);

create index if not exists purchase_credit_grants_user_idx
  on public.purchase_credit_grants (user_id, created_at desc);

create table if not exists public.unmatched_purchases (
  sale_id text primary key,
  purchaser_email text,
  account_email text,
  product_permalink text,
  product_name text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_email_mismatches (
  id uuid primary key default gen_random_uuid(),
  sale_id text,
  user_email text,
  purchaser_email text,
  resolved_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists users_email_lower_idx
  on public.users (lower(email));

create or replace function public.apply_pro_purchase(
  p_sale_id text,
  p_user_id uuid,
  p_account_email text,
  p_plan_type text,
  p_purchased_at timestamptz,
  p_expires_at timestamptz,
  p_item_name text default null,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_sale_price numeric default 0,
  p_audit_reason text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  existing public.purchase_credit_grants%rowtype;
  u public.users%rowtype;
begin
  if p_plan_type not in ('pro_monthly', 'pro_yearly') then
    return jsonb_build_object('ok', false, 'error', 'unknown_plan');
  end if;

  select * into existing
  from public.purchase_credit_grants
  where sale_id = p_sale_id
  for update;

  if found then
    return jsonb_build_object(
      'ok', true,
      'alreadyProcessed', true,
      'userId', existing.user_id,
      'creditsGranted', 0,
      'entitlement', existing.entitlement,
      'expiresAt', p_expires_at
    );
  end if;

  select * into u
  from public.users
  where id = p_user_id
  for update;

  if not found then
    insert into public.unmatched_purchases (
      sale_id, purchaser_email, account_email, reason
    ) values (
      p_sale_id, p_buyer_email, p_account_email, 'user_not_found'
    )
    on conflict (sale_id) do nothing;
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  update public.users
  set
    plan = 'pro',
    plan_type = p_plan_type,
    plan_expires_at = p_expires_at
  where id = p_user_id;

  insert into public.confirmed_purchases (
    purchase_id,
    user_id,
    plan_type,
    item_name,
    buyer_name,
    purchase_email,
    buyer_email,
    user_email,
    purchased_at,
    subscription_end_date,
    sale_price,
    refunded,
    fully_refunded,
    disputed,
    access_revoked
  ) values (
    p_sale_id,
    p_user_id,
    p_plan_type,
    p_item_name,
    p_buyer_name,
    p_account_email,
    p_buyer_email,
    p_account_email,
    p_purchased_at,
    p_expires_at,
    coalesce(p_sale_price, 0),
    false,
    false,
    false,
    false
  )
  on conflict (purchase_id) do update set
    user_id = excluded.user_id,
    plan_type = excluded.plan_type,
    item_name = excluded.item_name,
    buyer_name = excluded.buyer_name,
    purchase_email = excluded.purchase_email,
    buyer_email = excluded.buyer_email,
    user_email = excluded.user_email,
    purchased_at = excluded.purchased_at,
    subscription_end_date = excluded.subscription_end_date,
    sale_price = excluded.sale_price,
    refunded = false,
    fully_refunded = false,
    disputed = false,
    access_revoked = false;

  insert into public.purchase_credit_grants (
    sale_id,
    user_id,
    account_email,
    plan_type,
    entitlement,
    credits_delta,
    audit_reason
  ) values (
    p_sale_id,
    p_user_id,
    p_account_email,
    p_plan_type,
    'unlimited_pro',
    0,
    p_audit_reason
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyProcessed', false,
    'userId', p_user_id,
    'creditsGranted', 'unlimited',
    'entitlement', 'unlimited_pro',
    'expiresAt', p_expires_at
  );
end;
$$;

revoke all on function public.apply_pro_purchase(
  text, uuid, text, text, timestamptz, timestamptz, text, text, text, numeric, text
) from public;
grant execute on function public.apply_pro_purchase(
  text, uuid, text, text, timestamptz, timestamptz, text, text, text, numeric, text
) to service_role;
