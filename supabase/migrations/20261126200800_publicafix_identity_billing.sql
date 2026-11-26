-- PublicaFix identity and billing baseline.
-- Applied to Supabase project zctyrpslczgjhpleovnc on 2026-11-26.
-- User-readable subscription state is separate from server-only Stripe references.

begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 80)
);
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_key text not null check (plan_key in ('essencial', 'profissional', 'empresarial')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  plan_key text not null check (plan_key in ('essencial', 'profissional', 'empresarial')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_subscriptions_user_status_idx
  on public.billing_subscriptions (user_id, status, current_period_end desc);
create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on table public.profiles, public.subscriptions, public.billing_customers,
  public.billing_subscriptions, public.billing_webhook_events from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;
grant all on table public.profiles, public.subscriptions, public.billing_customers,
  public.billing_subscriptions, public.billing_webhook_events to service_role;

create policy "Users can read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Users can read their own subscription" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "No direct client access to billing customers" on public.billing_customers
  for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to billing subscriptions" on public.billing_subscriptions
  for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to billing webhook events" on public.billing_webhook_events
  for all to anon, authenticated using (false) with check (false);

create or replace function private.handle_new_publicafix_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_publicafix_user() from public, anon, authenticated;
drop trigger if exists on_publicafix_auth_user_created on auth.users;
create trigger on_publicafix_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_publicafix_user();
commit;
