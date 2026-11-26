-- Track monthly analysis quota without storing script contents.
-- The table and RPC are server-only; browser roles have no privileges.

create table if not exists public.analysis_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

alter table public.analysis_usage_monthly enable row level security;
revoke all on table public.analysis_usage_monthly from public, anon, authenticated;
grant select, insert, update on table public.analysis_usage_monthly to service_role;

drop policy if exists "Service role manages monthly analysis quota" on public.analysis_usage_monthly;
create policy "Service role manages monthly analysis quota"
on public.analysis_usage_monthly
for all
to service_role
using (true)
with check (true);

create or replace function public.consume_analysis_quota(
  p_user_id uuid,
  p_limit integer
)
returns table (
  allowed boolean,
  used_count integer,
  limit_count integer,
  month_start date
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_month_start date := (date_trunc('month', timezone('UTC', now())))::date;
  v_used integer;
begin
  if p_user_id is null or p_limit is null or p_limit < 1 or p_limit > 100000 then
    raise exception 'Invalid quota arguments';
  end if;

  insert into public.analysis_usage_monthly as usage (
    user_id, month_start, used_count, updated_at
  )
  values (p_user_id, v_month_start, 1, now())
  on conflict on constraint analysis_usage_monthly_pkey
  do update
    set used_count = usage.used_count + 1,
        updated_at = now()
    where usage.used_count < p_limit
  returning usage.used_count into v_used;

  if found then
    return query select true, v_used, p_limit, v_month_start;
    return;
  end if;

  select usage.used_count
    into v_used
    from public.analysis_usage_monthly as usage
    where usage.user_id = p_user_id
      and usage.month_start = v_month_start;

  return query select false, coalesce(v_used, 0), p_limit, v_month_start;
end;
$function$;

revoke all on function public.consume_analysis_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_analysis_quota(uuid, integer) to service_role;
