-- =====================================================================
-- SOMA~LINK v15 // ПОЛНАЯ СХЕМА С НУЛЯ + RLS + АНТИ-ДЕАНОН + ЗАЩИТА ОПЛАТ
-- Скопируйте этот файл целиком в Supabase → SQL Editor → нажмите Run.
-- Скрипт идемпотентен: повторный запуск ничего не сломает.
-- =====================================================================

-- 1. Таблица анонимных профилей игроков (БЕЗ ников и БЕЗ Telegram ID!)
create table if not exists public.soma_users (
    username text primary key check (username ~ '^u_[0-9a-f]{4,32}$'),
    xp integer not null default 0 check (xp >= 0),
    warmth integer not null default 0 check (warmth >= 0),
    seen integer not null default 0 check (seen >= 0),
    reacts integer not null default 0 check (reacts >= 0),
    help_attempts integer not null default 0 check (help_attempts >= 0),
    whispers_sent integer not null default 0 check (whispers_sent >= 0),
    weekly_xp integer not null default 0 check (weekly_xp >= 0),
    weekly_key text not null default '',
    cosmetics jsonb not null default '{}'::jsonb,
    owned_cosmetics text[] not null default '{}'::text[],
    created_at timestamptz not null default now()
);

alter table public.soma_users
    add column if not exists warmth integer not null default 0,
    add column if not exists seen integer not null default 0,
    add column if not exists reacts integer not null default 0,
    add column if not exists help_attempts integer not null default 0,
    add column if not exists whispers_sent integer not null default 0,
    add column if not exists weekly_xp integer not null default 0,
    add column if not exists weekly_key text not null default '',
    add column if not exists cosmetics jsonb not null default '{}'::jsonb,
    add column if not exists owned_cosmetics text[] not null default '{}'::text[];

create index if not exists soma_users_xp_idx
    on public.soma_users (xp desc);

create index if not exists soma_users_weekly_idx
    on public.soma_users (weekly_key, weekly_xp desc);

-- 2. Таблица «Ленты боли» (ФИЗИЧЕСКИ БЕЗ ID АВТОРА — 100% анонимность!)
create table if not exists public.soma_posts (
    id text primary key check (char_length(id) between 4 and 48),
    author text not null default 'Аноним' check (char_length(author) <= 32),
    tag text not null default 'ЛИЧНАЯ БОЛЬ' check (char_length(tag) <= 32),
    text text not null check (char_length(text) between 13 and 666),
    likes integer not null default 0 check (likes >= 0),
    created_at timestamptz not null default now()
);

create index if not exists soma_posts_created_idx
    on public.soma_posts (created_at desc);

-- 3. Закрытый журнал платежей Telegram Stars (для учёта и защиты от дублей)
create table if not exists public.soma_purchases (
    charge_id text primary key,
    username text not null,
    tg_user_id bigint not null default 0,
    item_id text not null,
    stars integer not null check (stars > 0),
    payload text not null,
    created_at timestamptz not null default now()
);

-- 4. Включаем Row Level Security (RLS) на всех таблицах
alter table public.soma_users enable row level security;
alter table public.soma_posts enable row level security;
alter table public.soma_purchases enable row level security;
-- Клиентам прямой доступ к soma_purchases закрыт (0 политик для anon/authenticated; пишет только Edge Function с service_role)

-- Политики для soma_posts (чтение, публикация 13..666 симв., лайк; удаление запрещено!)
drop policy if exists "soma_posts_select" on public.soma_posts;
create policy "soma_posts_select" on public.soma_posts
    for select to anon, authenticated using (true);

drop policy if exists "soma_posts_insert" on public.soma_posts;
create policy "soma_posts_insert" on public.soma_posts
    for insert to anon, authenticated
    with check (
        char_length(text) between 13 and 666
        and likes = 0
        and author ~ '^Аноним( #[0-9]{4})?$'
    );

drop policy if exists "soma_posts_update_likes" on public.soma_posts;
create policy "soma_posts_update_likes" on public.soma_posts
    for update to anon, authenticated using (true) with check (true);

-- Триггер защиты постов: запрещает менять текст, тег или автора чужого поста и скручивать лайки
create or replace function public.guard_soma_posts()
returns trigger
language plpgsql
as $$
declare
    v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
    if v_role = 'service_role' or current_user in ('postgres', 'supabase_admin') then
        return new;
    end if;

    if tg_op = 'UPDATE' then
        new.id := old.id;
        new.author := old.author;
        new.tag := old.tag;
        new.text := old.text;
        new.created_at := old.created_at;
        new.likes := least(old.likes + 1, greatest(old.likes, coalesce(new.likes, old.likes)));
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_soma_posts on public.soma_posts;
create trigger trg_guard_soma_posts
    before update on public.soma_posts
    for each row execute function public.guard_soma_posts();

-- Политики для soma_users (удаление запрещено!)
drop policy if exists "soma_users_select" on public.soma_users;
create policy "soma_users_select" on public.soma_users
    for select to anon, authenticated using (true);

drop policy if exists "soma_users_insert" on public.soma_users;
create policy "soma_users_insert" on public.soma_users
    for insert to anon, authenticated
    with check (username ~ '^u_[0-9a-f]{4,32}$');

drop policy if exists "soma_users_update" on public.soma_users;
create policy "soma_users_update" on public.soma_users
    for update to anon, authenticated using (true) with check (true);

-- 5. Серверная функция атомарной выдачи купленного атрибута (только для service_role)
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
    -- Сырой Telegram ID не сохраняется (пишем 0 ради полной приватности)
    insert into public.soma_purchases (charge_id, username, tg_user_id, item_id, stars, payload)
    values (p_charge_id, p_username, 0, p_item_id, p_stars, p_payload)
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

-- 6. Защита от подмены покупок и скручивания прогресса из браузера:
--    Клиент (anon) не может сам менять owned_cosmetics, не может надеть некупленный предмет
--    и не может обнулить чужой XP или тепло.
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
        new.username := old.username;
        new.owned_cosmetics := coalesce(old.owned_cosmetics, '{}'::text[]);
        new.xp := greatest(coalesce(old.xp, 0), coalesce(new.xp, 0));
        new.warmth := greatest(coalesce(old.warmth, 0), coalesce(new.warmth, 0));
        new.seen := greatest(coalesce(old.seen, 0), coalesce(new.seen, 0));
        new.reacts := greatest(coalesce(old.reacts, 0), coalesce(new.reacts, 0));
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
