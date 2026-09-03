-- Grant Monique Pro after a missed Gumroad webhook.

update public.users
set
  plan = 'pro',
  plan_type = 'pro_monthly',
  plan_expires_at = now() + interval '1 month'
where lower(email) = '3810895@myuwc.ac.za';

insert into public.confirmed_purchases (
  purchase_id,
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
  'manual-3810895@myuwc.ac.za',
  'pro_monthly',
  'Pro Monthly',
  'Monique',
  '3810895@myuwc.ac.za',
  '3810895@myuwc.ac.za',
  '3810895@myuwc.ac.za',
  now(),
  now() + interval '1 month',
  0,
  false,
  false,
  false,
  false
)
on conflict (purchase_id) do update set
  plan_type = excluded.plan_type,
  item_name = excluded.item_name,
  buyer_name = excluded.buyer_name,
  purchase_email = excluded.purchase_email,
  buyer_email = excluded.buyer_email,
  user_email = excluded.user_email,
  purchased_at = excluded.purchased_at,
  subscription_end_date = excluded.subscription_end_date,
  refunded = false,
  fully_refunded = false,
  disputed = false,
  access_revoked = false;
