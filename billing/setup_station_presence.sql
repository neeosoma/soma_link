-- Shared station atmosphere from real anonymous presence marks.
-- Requires billing/setup_stars.sql and billing/setup_witness_marks.sql.
-- This exposes neither a count nor a target story; it only enables a soft light.
begin;

create index if not exists soma_post_witness_atmosphere_idx
    on soma_private.post_witness_marks (created_at desc, post_id);

create or replace function public.station_presence_atmosphere_status()
returns table (is_lit boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_is_lit boolean := false;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    -- Keep very small groups private. The threshold is only a server-side
    -- privacy floor: neither the number nor a particular story is returned.
    select count(distinct m.post_id) >= 5
      into v_is_lit
      from soma_private.post_witness_marks m
      join public.soma_posts p on p.id = m.post_id
      join soma_private.post_owners o on o.post_id = p.id
     where m.created_at >= now() - interval '24 hours'
       and m.created_at <= now()
       and p.created_at <= now();

    return query select coalesce(v_is_lit, false);
end;
$$;

revoke all on function public.station_presence_atmosphere_status() from public, anon, authenticated;
grant execute on function public.station_presence_atmosphere_status() to authenticated;
comment on function public.station_presence_atmosphere_status() is
    'Returns one boolean for soft station ambience when a privacy floor of recent presence marks is reached; never returns counts or story IDs.';

-- Public aggregate: total person-days spent in the app since registration.
-- Counted as the sum of each user's full days since soma_users.created_at;
-- a global aggregate only, no per-user data is exposed.
-- Math uses epoch seconds (not extract(day from interval), which reads the
-- interval's day FIELD and returns 0 for any interval shorter than a day).
create or replace function public.station_days_in_app_total()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(floor(extract(epoch from sum(now() - u.created_at)) / 86400)::integer, 0)
      from public.soma_users u
$$;

revoke all on function public.station_days_in_app_total() from public, anon, authenticated;
grant execute on function public.station_days_in_app_total() to anon, authenticated;
comment on function public.station_days_in_app_total() is
    'Total person-days spent in the app since registration, counted from each user registration time; a global aggregate with no per-user data.';

-- Per-account lifetime: full days this Auth identity's own profile has existed
-- since it first entered the game (soma_users.created_at). Every registered
-- account sees its own real stat, never anyone else's. greatest(1, ...) so a
-- fresh account (less than a day old) shows «1 ДЕНЬ» — the day of first
-- entry — instead of a confusing «0 ДНЕЙ». floor (not ceil) keeps exact
-- whole-day boundaries from drifting up a day by a millisecond.
create or replace function public.my_soma_account_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce((
        select case
            when floor(extract(epoch from now() - u.created_at) / 86400)::integer is null then 0
            else greatest(1, floor(extract(epoch from now() - u.created_at) / 86400)::integer)
        end
          from soma_private.user_profile_bindings b
          join public.soma_users u on u.username = b.profile_uid
         where b.auth_id = auth.uid()
    ), 0)::integer
$$;

revoke all on function public.my_soma_account_days() from public, anon, authenticated;
grant execute on function public.my_soma_account_days() to authenticated;
comment on function public.my_soma_account_days() is
    'Full days since the current Auth identity profile was created; per-account lifetime only, never another user data.';

commit;
