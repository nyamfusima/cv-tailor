-- Keep the platform admin account on unlimited Pro.

update public.users
set
  plan = 'pro',
  plan_type = 'pro_yearly',
  plan_expires_at = '2099-12-31T00:00:00Z'
where lower(email) = 'nyamfusima@gmail.com';

insert into public.confirmed_purchases (
  purchase_id,
  plan_type,
  item_name,
  purchase_email,
  user_email,
  purchased_at,
  subscription_end_date,
  refunded,
  fully_refunded,
  disputed,
  access_revoked
) values (
  'admin-nyamfusima@gmail.com',
  'pro_yearly',
  'Admin Pro',
  'nyamfusima@gmail.com',
  'nyamfusima@gmail.com',
  now(),
  '2099-12-31T00:00:00Z',
  false,
  false,
  false,
  false
)
on conflict (purchase_id) do update set
  plan_type = excluded.plan_type,
  item_name = excluded.item_name,
  purchase_email = excluded.purchase_email,
  user_email = excluded.user_email,
  subscription_end_date = excluded.subscription_end_date,
  refunded = false,
  fully_refunded = false,
  disputed = false,
  access_revoked = false;
