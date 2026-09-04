-- One-time repair: grant the 3 Sep 2026 Pro Monthly purchase to jephtha25@gmail.com.
-- Does NOT modify 3810895@myuwc.ac.za. Does not invent a Gumroad sale_id if none exists.
--
-- Historical repair: Gumroad Pro Monthly purchase for jephtha25@gmail.com did not grant dashboard credits.
--
-- Safe to re-run. No-ops when the Gmail user is missing (local/dev).

do $$
declare
  target_user public.users%rowtype;
  existing_purchase public.confirmed_purchases%rowtype;
  sale_id text;
  purchased_at timestamptz := timestamptz '2026-09-03 11:29:00+02';
  expires_at timestamptz := timestamptz '2026-10-03 11:29:00+02';
  audit_reason text := 'Historical repair: Gumroad Pro Monthly purchase for jephtha25@gmail.com did not grant dashboard credits.';
  already_granted boolean := false;
  missing_stable_id boolean := false;
begin
  select * into target_user
  from public.users
  where lower(trim(email)) = 'jephtha25@gmail.com'
  order by id
  limit 1;

  if not found then
    raise notice 'REPAIR_SKIPPED: no authenticated user for jephtha25@gmail.com';
    return;
  end if;

  if (select count(*) from public.users where lower(trim(email)) = 'jephtha25@gmail.com') > 1 then
    raise exception 'REPAIR_ABORTED: multiple users rows for jephtha25@gmail.com';
  end if;

  select * into existing_purchase
  from public.confirmed_purchases
  where (
      lower(trim(coalesce(purchase_email, ''))) = 'jephtha25@gmail.com'
      or lower(trim(coalesce(user_email, ''))) = 'jephtha25@gmail.com'
      or lower(trim(coalesce(buyer_email, ''))) = 'jephtha25@gmail.com'
      or user_id = target_user.id
    )
    and coalesce(refunded, false) = false
    and coalesce(fully_refunded, false) = false
    and coalesce(access_revoked, false) = false
    and purchased_at >= timestamptz '2026-09-03 00:00:00+02'
    and purchased_at < timestamptz '2026-09-04 00:00:00+02'
  order by purchased_at desc
  limit 1;

  if found then
    sale_id := existing_purchase.purchase_id;
    if existing_purchase.purchased_at is not null then
      purchased_at := existing_purchase.purchased_at;
    end if;
    if existing_purchase.subscription_end_date is not null then
      expires_at := existing_purchase.subscription_end_date;
    end if;
    if sale_id like 'repair-%' or sale_id like 'manual-%' or sale_id like 'gumroad-%' then
      missing_stable_id := true;
    end if;
  else
    sale_id := 'repair-jephtha25-2026-09-03';
    missing_stable_id := true;
    raise notice 'Historical record lacks a stable Gumroad sale_id; using %', sale_id;
  end if;

  select exists(
    select 1 from public.purchase_credit_grants where sale_id = sale_id
  ) into already_granted;

  if already_granted then
    raise notice 'REPAIR_ALREADY_GRANTED: sale % already has a credit grant for this purchase', sale_id;
  elsif to_regprocedure('public.apply_pro_purchase(text,uuid,text,text,timestamptz,timestamptz,text,text,text,numeric,text)') is not null then
    perform public.apply_pro_purchase(
      sale_id,
      target_user.id,
      'jephtha25@gmail.com',
      'pro_monthly',
      purchased_at,
      expires_at,
      'Pro Monthly',
      'Monique Jephtha',
      'jephtha25@gmail.com',
      98.97,
      audit_reason
    );
  else
    update public.users
    set
      plan = 'pro',
      plan_type = 'pro_monthly',
      plan_expires_at = expires_at
    where id = target_user.id;

    insert into public.confirmed_purchases (
      purchase_id, user_id, plan_type, item_name, buyer_name, purchase_email, buyer_email,
      user_email, purchased_at, subscription_end_date, sale_price,
      refunded, fully_refunded, disputed, access_revoked
    ) values (
      sale_id, target_user.id, 'pro_monthly', 'Pro Monthly', 'Monique Jephtha',
      'jephtha25@gmail.com', 'jephtha25@gmail.com', 'jephtha25@gmail.com',
      purchased_at, expires_at, 98.97, false, false, false, false
    )
    on conflict (purchase_id) do update set
      user_id = excluded.user_id,
      plan_type = excluded.plan_type,
      purchase_email = excluded.purchase_email,
      buyer_email = excluded.buyer_email,
      user_email = excluded.user_email,
      subscription_end_date = excluded.subscription_end_date,
      refunded = false,
      fully_refunded = false,
      disputed = false,
      access_revoked = false;

    insert into public.purchase_credit_grants (
      sale_id, user_id, account_email, plan_type, entitlement, credits_delta, audit_reason
    ) values (
      sale_id, target_user.id, 'jephtha25@gmail.com', 'pro_monthly', 'unlimited_pro', 0, audit_reason
    )
    on conflict (sale_id) do nothing;
  end if;

  if missing_stable_id then
    raise notice 'VERIFY: historical Gmail purchase used derived key %; replay the Gumroad ping with sale_id when available', sale_id;
  end if;

  raise notice 'REPAIR_OK user_id=% email=jephtha25@gmail.com sale_id=% plan=% expires=% tailor_count=%',
    target_user.id, sale_id, 'pro', expires_at, target_user.tailor_count;
end;
$$;

-- Verification (run after the repair; do not expect remaining_credits = 2 unless tailor_count is 1 AND plan is still free):
--
-- select id, email, plan, plan_type, plan_expires_at, tailor_count
-- from public.users
-- where lower(trim(email)) = 'jephtha25@gmail.com';
--
-- select purchase_id, user_id, purchase_email, user_email, purchased_at, subscription_end_date
-- from public.confirmed_purchases
-- where lower(trim(coalesce(purchase_email,''))) = 'jephtha25@gmail.com'
--    or lower(trim(coalesce(user_email,''))) = 'jephtha25@gmail.com';
--
-- select sale_id, user_id, account_email, entitlement, audit_reason
-- from public.purchase_credit_grants
-- where lower(account_email) = 'jephtha25@gmail.com';
--
-- Customer-facing check: GET /api/account/plan as jephtha25@gmail.com
-- must return plan=pro, credits_unlimited=true, remaining_credits=null.
