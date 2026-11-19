-- =====================================================================
-- SOMA_LINK v6 // Бессерверная монетизация (Telegram Stars) + Охота недели
-- Скопируйте этот файл целиком в Supabase → SQL Editor → нажмите Run.
-- Скрипт идемпотентен: повторный запуск ничего не сломает.
-- =====================================================================

-- 1. Расширяем таблицу игроков (только эстетика и недельный рейтинг — 0 pay-to-win)
alter table public.soma_users
    add column if not exists cosmetics jsonb not null default '{}'::jsonb,
    add column if not exists owned_cosmetics text[] not null default '{}'::text[],
    add column if not exists weekly_xp integer not null default 0,
    add column if not exists weekly_key text not null default '';

create index if not exists soma_users_weekly_idx
    on public.soma_users (weekly_key, weekly_xp desc);

-- 2. Журнал реальных платежей Telegram Stars (для учёта, защиты от дублей и возвратов)
create table if not exists public.soma_purchases (
    charge_id text primary key,
    username text not null,
    tg_user_id bigint not null,
    item_id text not null,
    stars integer not null check (stars > 0),
    payload text not null,
    created_at timestamptz not null default now()
);

alter table public.soma_purchases enable row level security;
-- Клиентам прямой доступ к журналу покупок закрыт (пишет только Edge Function с service_role)

-- 3. Серверная функция атомарной выдачи купленного атрибута (только для service_role)
create or replace function public.grant_soma_cosmetic(
    p_charge_id text,
    p_username text,
    p_tg_user_id bigint,
    p_item_id text,
    p_stars integer,
    p_payload text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inserted integer := 0;
begin
    insert into public.soma_purchases (charge_id, username, tg_user_id, item_id, stars, payload)
    values (p_charge_id, p_username, p_tg_user_id, p_item_id, p_stars, p_payload)
    on conflict (charge_id) do nothing;

    get diagnostics v_inserted = row_count;

    insert into public.soma_users (username, owned_cosmetics)
    values (p_username, array[p_item_id])
    on conflict (username) do update
    set owned_cosmetics = (
        select array_agg(distinct x order by x)
        from unnest(coalesce(public.soma_users.owned_cosmetics, '{}'::text[]) || array[p_item_id]) as x
    );

    return v_inserted > 0;
end;
$$;

revoke all on function public.grant_soma_cosmetic(text, text, bigint, text, integer, text) from public, anon, authenticated;
grant execute on function public.grant_soma_cosmetic(text, text, bigint, text, integer, text) to service_role;

-- 4. Защита от подмены покупок из браузера:
--    Клиент (anon) не может сам менять owned_cosmetics и не может надеть в cosmetics то, чего нет в owned_cosmetics.
create or replace function public.guard_soma_cosmetics()
returns trigger
language plpgsql
as $$
declare
    v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
    v_owned text[];
    v_slot text;
    v_val text;
begin
    -- Edge Function (service_role) и SQL Editor (postgres) имеют полные права
    if v_role = 'service_role' or current_user in ('postgres', 'supabase_admin') then
        return new;
    end if;

    -- Обычный клиент не может сам дописать себе owned_cosmetics
    if tg_op = 'INSERT' then
        new.owned_cosmetics := '{}'::text[];
    else
        new.owned_cosmetics := coalesce(old.owned_cosmetics, '{}'::text[]);
    end if;

    v_owned := new.owned_cosmetics;

    -- Проверяем, что каждый надетый слот действительно куплен
    if new.cosmetics is not null and jsonb_typeof(new.cosmetics) = 'object' then
        foreach v_slot in array array['frame', 'seal', 'title', 'pager', 'pot'] loop
            v_val := coalesce(new.cosmetics ->> v_slot, '');
            if v_val <> '' and not (v_val = any(v_owned)) then
                new.cosmetics := new.cosmetics - v_slot;
            end if;
        end loop;

        if coalesce((new.cosmetics ->> 'cat')::boolean, false) and not ('room_cat' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{cat}', 'false'::jsonb);
        end if;
        if coalesce((new.cosmetics ->> 'steam')::boolean, false) and not ('room_steam' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{steam}', 'false'::jsonb);
        end if;
        if coalesce((new.cosmetics ->> 'tape')::boolean, false) and not ('room_tape' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{tape}', 'false'::jsonb);
        end if;
        if coalesce((new.cosmetics ->> 'garland')::boolean, false) and not ('room_garland' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{garland}', 'false'::jsonb);
        end if;
        if coalesce((new.cosmetics ->> 'candles')::boolean, false) and not ('room_candles' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{candles}', 'false'::jsonb);
        end if;
        if coalesce(new.cosmetics ->> 'epitaph', '') <> '' and not ('perk_epitaph' = any(v_owned)) then
            new.cosmetics := new.cosmetics - 'epitaph';
        end if;
        if length(coalesce(new.cosmetics ->> 'epitaph', '')) > 42 then
            new.cosmetics := jsonb_set(new.cosmetics, '{epitaph}', to_jsonb(left(new.cosmetics ->> 'epitaph', 42)));
        end if;
    else
        new.cosmetics := '{}'::jsonb;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_guard_soma_cosmetics on public.soma_users;
create trigger trg_guard_soma_cosmetics
    before insert or update on public.soma_users
    for each row execute function public.guard_soma_cosmetics();
