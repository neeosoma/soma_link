-- Private, opt-in anonymous room snapshots. Apply after setup_witness_marks.sql.
-- Only the deliberately enumerated visual fields are ever returned to visitors.
begin;
create schema if not exists soma_private;
revoke all on schema soma_private from public, anon, authenticated;

create table if not exists soma_private.room_visits (
    owner_id uuid primary key,
    scene jsonb not null,
    updated_at timestamptz not null default now()
);
alter table soma_private.room_visits enable row level security;
revoke all on soma_private.room_visits from public, anon, authenticated;

-- Validate and reconstruct rather than forwarding untrusted JSON: names, IDs,
-- private messages and arbitrary extra keys must never leak through the RPC.
create or replace function soma_private.clean_room_visit_scene(p jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
    v_bloomed jsonb;
    v_pots jsonb;
    v_room jsonb;
    v_greenhouse jsonb;
    v_cosmetics jsonb;
    v_active_seed jsonb;
    v_alien_seed jsonb;
begin
    if p is null or jsonb_typeof(p) <> 'object' or pg_catalog.octet_length(p::text) > 8192 then
        raise exception 'Invalid scene';
    end if;
    v_room := p->'room';
    v_greenhouse := p->'greenhouse';
    v_cosmetics := p->'cosmetics';
    if jsonb_typeof(v_room) is distinct from 'object'
       or coalesce(v_room->>'plant_kind','') !~ '^[0-7]$'
       or coalesce(v_room->>'plant_stage','') !~ '^(-1|[0-5])$'
       or coalesce(v_room->>'plant_seed','') !~ '^[0-9]{1,9}$'
       or coalesce(v_room->>'phase','') !~ '^[0-3]$'
       or coalesce(v_room->>'cat','') !~ '^(none|[0-9])$'
       or coalesce(v_room->>'dog','') !~ '^(none|[0-9])$' then
        raise exception 'Invalid room scene';
    end if;
    if jsonb_typeof(v_greenhouse) is distinct from 'object'
       or jsonb_typeof(v_greenhouse->'open') is distinct from 'boolean'
       or jsonb_typeof(v_greenhouse->'bloomed') is distinct from 'array'
       or jsonb_array_length(v_greenhouse->'bloomed') > 8
       or exists (select 1 from jsonb_array_elements(v_greenhouse->'bloomed') x
                   where jsonb_typeof(x) <> 'number' or x::text !~ '^[0-7]$') then
        raise exception 'Invalid greenhouse scene';
    end if;
    select coalesce(jsonb_agg(x order by x), '[]'::jsonb) into v_bloomed
      from (select distinct x from jsonb_array_elements(v_greenhouse->'bloomed') x) q;
    -- Store no per-flower free text. Unknown or unavailable cosmetics are omitted.
    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into v_pots
      from jsonb_each_text(case when jsonb_typeof(v_greenhouse->'pots') = 'object'
                                then v_greenhouse->'pots' else '{}'::jsonb end) e(k,v)
     where k ~ '^([0-7]|alien)$' and v in ('default','pot_cinnabar','pot_moon','pot_kintsugi','pot_amethyst');
    v_active_seed := case when (v_greenhouse->>'open')::boolean
        then jsonb_build_object(
            'kind', case when coalesce(v_greenhouse->>'active_kind','') ~ '^[0-7]$' then (v_greenhouse->>'active_kind')::integer else null end,
            'stage', case when coalesce(v_greenhouse->>'active_stage','') ~ '^(-1|[0-5])$' then (v_greenhouse->>'active_stage')::integer else -1 end,
            'seed', case when coalesce(v_greenhouse->>'active_seed','') ~ '^[0-9]{1,9}$' then (v_greenhouse->>'active_seed')::integer else 0 end,
            'leaf', case when coalesce(v_greenhouse->>'active_leaf','') ~ '^[0-9]$' then (v_greenhouse->>'active_leaf')::integer else 0 end,
            'bloom', case when coalesce(v_greenhouse->>'active_bloom','') ~ '^[0-9]$' then (v_greenhouse->>'active_bloom')::integer else 0 end,
            'pot_shape', case when coalesce(v_greenhouse->>'active_pot_shape','') ~ '^[0-2]$' then (v_greenhouse->>'active_pot_shape')::integer else 0 end,
            'pot_index', case when coalesce(v_greenhouse->>'active_pot_index','') ~ '^[0-9]$' then (v_greenhouse->>'active_pot_index')::integer else 0 end,
            'lean', case when coalesce(v_greenhouse->>'active_lean','') ~ '^(-1|0|1)$' then (v_greenhouse->>'active_lean')::integer else 0 end)
        else null end;
    v_alien_seed := case when (v_greenhouse->>'open')::boolean
        then jsonb_build_object(
            'kind', case when coalesce(v_greenhouse->>'alien_kind','') ~ '^[0-6]$' then (v_greenhouse->>'alien_kind')::integer else null end,
            'stage', case when coalesce(v_greenhouse->>'alien_stage','') ~ '^(-1|[0-5])$' then (v_greenhouse->>'alien_stage')::integer else -1 end,
            'seed', case when coalesce(v_greenhouse->>'alien_seed','') ~ '^[0-9]{1,9}$' then (v_greenhouse->>'alien_seed')::integer else 0 end,
            'leaf', case when coalesce(v_greenhouse->>'alien_leaf','') ~ '^[0-9]$' then (v_greenhouse->>'alien_leaf')::integer else 0 end,
            'bloom', case when coalesce(v_greenhouse->>'alien_bloom','') ~ '^[0-9]$' then (v_greenhouse->>'alien_bloom')::integer else 0 end,
            'pot_shape', case when coalesce(v_greenhouse->>'alien_pot_shape','') ~ '^[0-2]$' then (v_greenhouse->>'alien_pot_shape')::integer else 0 end,
            'pot_index', case when coalesce(v_greenhouse->>'alien_pot_index','') ~ '^[0-9]$' then (v_greenhouse->>'alien_pot_index')::integer else 0 end,
            'lean', case when coalesce(v_greenhouse->>'alien_lean','') ~ '^(-1|0|1)$' then (v_greenhouse->>'alien_lean')::integer else 0 end)
        else null end;
    -- A locked greenhouse must not reveal its collection through the API.
    if not (v_greenhouse->>'open')::boolean then
        v_bloomed := '[]'::jsonb;
        v_pots := '{}'::jsonb;
    end if;
    return jsonb_build_object(
        'room', jsonb_build_object('plant_kind', (v_room->>'plant_kind')::integer,
            'plant_stage', (v_room->>'plant_stage')::integer, 'plant_seed', (v_room->>'plant_seed')::integer,
            'phase', (v_room->>'phase')::integer, 'cat', v_room->>'cat', 'dog', v_room->>'dog',
            'alien_kind', case when coalesce(v_room->>'alien_kind','') ~ '^[0-6]$' then (v_room->>'alien_kind')::integer else null end,
            'leaf', case when coalesce(v_room->>'leaf','') ~ '^[0-9]$' then (v_room->>'leaf')::integer else 0 end,
            'bloom', case when coalesce(v_room->>'bloom','') ~ '^[0-9]$' then (v_room->>'bloom')::integer else 0 end,
            'pot_shape', case when coalesce(v_room->>'pot_shape','') ~ '^[0-2]$' then (v_room->>'pot_shape')::integer else 0 end,
            'pot_index', case when coalesce(v_room->>'pot_index','') ~ '^[0-9]$' then (v_room->>'pot_index')::integer else 0 end,
            'lean', case when coalesce(v_room->>'lean','') ~ '^(-1|0|1)$' then (v_room->>'lean')::integer else 0 end),
        'greenhouse', jsonb_build_object('open', (v_greenhouse->>'open')::boolean,
            'bloomed', v_bloomed, 'pots', v_pots,
            'active_seed', v_active_seed,
            'alien_seed', v_alien_seed,
            'placed', case when (v_greenhouse->>'open')::boolean and coalesce(v_greenhouse->>'placed','') ~ '^([0-7]|seed|alien)$' then v_greenhouse->>'placed' else null end),
        'cosmetics', jsonb_build_object('pot', case when v_cosmetics->>'pot' in
            ('default','pot_cinnabar','pot_moon','pot_kintsugi','pot_amethyst') then v_cosmetics->>'pot' else 'default' end,
            'garland', coalesce(v_cosmetics->'garland' = 'true'::jsonb, false),
            'tape', coalesce(v_cosmetics->'tape' = 'true'::jsonb, false),
            'steam', coalesce(v_cosmetics->'steam' = 'true'::jsonb, false),
            'candles', coalesce(v_cosmetics->'candles' = 'true'::jsonb, false))
    );
end;
$$;
revoke all on function soma_private.clean_room_visit_scene(jsonb) from public, anon, authenticated;

-- There is no row at all until the owner opts in. Opting out deletes the
-- snapshot immediately. Updates while opted out cannot accidentally opt in.
create or replace function public.set_room_visit_consent(p_enabled boolean, p_scene jsonb default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if p_enabled is null then raise exception 'Consent required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 83419));
    if not p_enabled then
        delete from soma_private.room_visits where owner_id = auth.uid();
        return false;
    end if;
    insert into soma_private.room_visits(owner_id, scene)
    values (auth.uid(), soma_private.clean_room_visit_scene(p_scene))
    on conflict (owner_id) do update set scene = excluded.scene, updated_at = now();
    return true;
end;
$$;
create or replace function public.update_room_visit_scene(p_scene jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 83419));
    update soma_private.room_visits set scene = soma_private.clean_room_visit_scene(p_scene), updated_at = now()
     where owner_id = auth.uid();
    return found;
end;
$$;
create or replace function public.my_room_visit_consent()
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    return exists (select 1 from soma_private.room_visits where owner_id = auth.uid());
end;
$$;
-- Keep only the last selection privately, so Next never repeats the same room.
create table if not exists soma_private.room_visit_last (
    visitor_id uuid primary key, owner_id uuid not null
);
alter table soma_private.room_visit_last enable row level security;
revoke all on soma_private.room_visit_last from public, anon, authenticated;
create or replace function public.random_room_visit()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_scene jsonb; v_owner uuid; v_last uuid;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 83420));
    select owner_id into v_last from soma_private.room_visit_last where visitor_id = auth.uid();
    select owner_id, scene into v_owner, v_scene from soma_private.room_visits
     where owner_id <> auth.uid() and owner_id is distinct from v_last order by random() limit 1;
    if v_owner is not null then
        insert into soma_private.room_visit_last(visitor_id, owner_id) values(auth.uid(), v_owner)
        on conflict(visitor_id) do update set owner_id = excluded.owner_id;
    end if;
    return v_scene;
end;
$$;
revoke all on function public.set_room_visit_consent(boolean,jsonb) from public, anon;
revoke all on function public.update_room_visit_scene(jsonb) from public, anon;
revoke all on function public.my_room_visit_consent() from public, anon;
revoke all on function public.random_room_visit() from public, anon;
grant execute on function public.set_room_visit_consent(boolean,jsonb), public.update_room_visit_scene(jsonb),
    public.my_room_visit_consent(), public.random_room_visit() to authenticated;
commit;
