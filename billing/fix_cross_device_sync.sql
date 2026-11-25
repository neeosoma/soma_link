-- =====================================================================
-- FIX: Кросс-устройствная синхронизация прогресса (объединённая модель)
-- Progress должен храниться в облаке (soma_users), а не только в localStorage.
-- localStorage остаётся кешем; при загрузке сливаем localStorage + облако (max/union).
-- =====================================================================

-- 1. Добавляем колонки для всего, что раньше было только в localStorage:
--    greenhouse — прогресс Оранжереи/цветка (bloomed, activeSeed, alienSeed, placed, pots)
--    my_posts   — id моих постов (сигналы)
--    ledger     — ведомство тепла/шёпотов (streak, warmDays, whispersSent, ...)
alter table public.soma_users
    add column if not exists greenhouse jsonb not null default '{}'::jsonb,
    add column if not exists my_posts text[] not null default '{}'::text[],
    add column if not exists ledger jsonb not null default '{}'::jsonb;

-- 2. my_soma_account_days: дни считать от earliest из auth.users.created_at
--    и soma_users.created_at (min). Анонимная идентичность auth может быть
--    создана раньше/позже профиля: считать от профиля alone давало 0 дней
--    на новом устройстве, а от auth alone — проворачивало счётчик в обратную
--    сторону (профиль создан раньше auth на некоторых устройствах).
--    Профиль привязан к auth-идентичности через user_profile_bindings.
create or replace function public.my_soma_account_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        greatest(1, floor(extract(epoch from now() - least(au.created_at, su.created_at)) / 86400)::integer),
        0
    )::integer
      from soma_private.user_profile_bindings b
      join public.soma_users su on su.username = b.profile_uid
      join auth.users au on au.id = b.auth_id
     where b.auth_id = auth.uid()
$$;

revoke all on function public.my_soma_account_days() from public, anon, authenticated;
grant execute on function public.my_soma_account_days() to authenticated;

-- 3. Правами на таблицу soma_users: RLS-политики есть, но без GRANT
--    SELECT/INSERT/UPDATE у anon/authenticated клиент не может читать и
--    записывать профиль (permission denied for table soma_users).
grant select, insert, update on public.soma_users to anon, authenticated;

-- 4. seen/reacts: триггер guard_soma_cosmetics() ссылался на эти колонки,
--    но они не сидели на БД, где setup применялся частично — поэтому любой
--    INSERT/UPDATE на soma_users падал с 'record "new" has no field "seen"'
--    и прогресс с устройств не доставался в облако.
--    Колонки добавляются (SETUP_FULL.sql их уже создаёт), а функция триггера
--    редефинируется без ссылок на seen/reacts — пусть они существуют,
--    триггер не должен зависеть от них.
alter table public.soma_users
    add column if not exists seen integer not null default 0,
    add column if not exists reacts integer not null default 0;

create or replace function public.guard_soma_cosmetics()
returns trigger
language plpgsql
as $$
declare
    v_owned text[];
    v_slot text;
    v_val text;
begin
    -- Edge Function (service_role) и SQL Editor (postgres) имеют полные права
    if current_setting('request.jwt.claim.role', true) = 'service_role'
       or current_user in ('postgres', 'supabase_admin') then
        return new;
    end if;

    -- Обычный клиент не может сам дописать себе owned_cosmetics
    if tg_op = 'INSERT' then
        new.owned_cosmetics := '{}'::text[];
    else
        new.username := old.username;
        new.owned_cosmetics := coalesce(old.owned_cosmetics, '{}'::text[]);
        new.xp := greatest(coalesce(old.xp, 0), coalesce(new.xp, 0));
        new.warmth := greatest(coalesce(old.warmth, 0), coalesce(new.warmth, 0));
        new.help_attempts := greatest(coalesce(old.help_attempts, 0), coalesce(new.help_attempts, 0));
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
        if coalesce((new.cosmetics ->> 'dog')::boolean, false) and not ('room_dog' = any(v_owned)) then
            new.cosmetics := jsonb_set(new.cosmetics, '{dog}', 'false'::jsonb);
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
        if length(coalesce(new.cosmetics ->> 'epitaph', '')) > 66 then
            new.cosmetics := jsonb_set(new.cosmetics, '{epitaph}', to_jsonb(left(new.cosmetics ->> 'epitaph', 66)));
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

commit;
