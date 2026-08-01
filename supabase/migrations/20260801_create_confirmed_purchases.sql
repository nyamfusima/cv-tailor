create table if not exists public.confirmed_purchases (
  purchase_id text primary key,
  plan_type text not null check (plan_type in ('pro_monthly', 'pro_yearly')),
  item_name text,
  buyer_name text,
  purchase_email text,
  buyer_email text,
  user_email text,
  purchased_at timestamptz not null,
  subscription_end_date timestamptz,
  sale_price numeric,
  refunded boolean not null default false,
  fully_refunded boolean not null default false,
  disputed boolean not null default false,
  access_revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists confirmed_purchases_plan_purchase_idx
  on public.confirmed_purchases (plan_type, purchased_at desc);

insert into public.confirmed_purchases (
  purchase_id, plan_type, item_name, buyer_name, purchase_email, buyer_email,
  user_email, purchased_at, sale_price
) values
  ('-9UaAQ_MWnCsZo_8ZJybWQ==', 'pro_monthly', 'Pro Monthly', 'Monique', '3810895@myuwc.ac.za', '3810895@myuwc.ac.za', '3810895@myuwc.ac.za', '2026-05-19T06:28:28+00:00', 5.95),
  ('IFmD1yB81rBUS3pY14wSFg==', 'pro_monthly', 'Pro Monthly', 'Anele Manzini', 'manzinianele16@gmail.com', null, 'Anele', '2026-06-19T11:41:44+00:00', 6.00),
  ('_8FrR6jOgSiFH0iiOJvc2Q==', 'pro_monthly', 'Pro Monthly', 'Nompumelelo Zengetwa', 'nompumelelozengetwa4@gmail.com', null, 'nompumelelozengetwa4@gmail.com', '2026-06-19T13:55:20+00:00', 6.93),
  ('mddIuxuse5fTvMP0S5aAkg==', 'pro_monthly', 'Pro Monthly', null, 'bantu911sam@gmail.com', null, 'ba', '2026-07-28T18:18:41+00:00', 5.93),
  ('UQED4ILrRnlUiY30_SoqYQ==', 'pro_monthly', 'Pro Monthly', 'Gaudensia Mutanda', 'mutandagee@yahoo.com', 'mutandagee@yahoo.com', 'mutandagee@yahoo.com', '2026-07-29T11:57:39+00:00', 5.91)
on conflict (purchase_id) do update set
  plan_type = excluded.plan_type,
  item_name = excluded.item_name,
  buyer_name = excluded.buyer_name,
  purchase_email = excluded.purchase_email,
  buyer_email = excluded.buyer_email,
  user_email = excluded.user_email,
  purchased_at = excluded.purchased_at,
  sale_price = excluded.sale_price;
