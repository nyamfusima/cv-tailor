alter table public.users
  add column if not exists plan_type text,
  add column if not exists plan_expires_at timestamptz;

create index if not exists users_pro_plan_expiry_idx
  on public.users (plan, plan_expires_at);
