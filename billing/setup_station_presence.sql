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

commit;
