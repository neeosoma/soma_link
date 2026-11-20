-- ======================================================================
-- SOMA~LINK // FULL PRODUCTION SETUP — single paste-ready script
-- Apply in Supabase → SQL Editor → New query → Run (as project owner).
-- Transactional and idempotent: safe to rerun.
-- ORDER IS MANDATORY: base schema → witness → presence → pager → room visits.
-- ======================================================================

-- >>> STEP 1: base schema (setup_stars.sql)
begin;

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

-- 7. Таблица анонимного канала «Шёпот» (пейджер NEEOSOMA // NMAV-04):
--    Связь идёт СТРОГО по post_id (без ID автора поста — 100% анонимность!).
--    Ограничение unique (post_id, sender_uid) физически запрещает шептать одному человеку дважды.
create table if not exists public.soma_whispers (
    id text primary key check (char_length(id) between 4 and 64),
    post_id text not null check (char_length(post_id) between 4 and 48),
    post_tag text not null default 'ЛИЧНАЯ БОЛЬ' check (char_length(post_tag) <= 32),
    post_preview text not null default '' check (char_length(post_preview) <= 180),
    sender_uid text not null check (sender_uid ~ '^u_[0-9a-f]{4,32}$'),
    text text not null check (char_length(text) between 13 and 333),
    status text not null default 'pending' check (status in ('pending', 'saved', 'dismissed')),
    created_at timestamptz not null default now(),
    unique (post_id, sender_uid)
);

create index if not exists soma_whispers_post_idx
    on public.soma_whispers (post_id, created_at desc);

create index if not exists soma_whispers_sender_idx
    on public.soma_whispers (sender_uid, status);

alter table public.soma_whispers enable row level security;

drop policy if exists "soma_whispers_select" on public.soma_whispers;
create policy "soma_whispers_select" on public.soma_whispers
    for select to anon, authenticated using (true);

drop policy if exists "soma_whispers_insert" on public.soma_whispers;
create policy "soma_whispers_insert" on public.soma_whispers
    for insert to anon, authenticated
    with check (
        char_length(text) between 13 and 333
        and status = 'pending'
        and sender_uid ~ '^u_[0-9a-f]{4,32}$'
    );

drop policy if exists "soma_whispers_update_status" on public.soma_whispers;
create policy "soma_whispers_update_status" on public.soma_whispers
    for update to anon, authenticated using (true) with check (status in ('pending', 'saved', 'dismissed'));

-- Триггер защиты шёпотов: запрещает менять текст, отправителя или пост после отправки (разрешён только перевод статуса pending -> saved/dismissed)
create or replace function public.guard_soma_whispers()
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
        new.post_id := old.post_id;
        new.post_tag := old.post_tag;
        new.post_preview := old.post_preview;
        new.sender_uid := old.sender_uid;
        new.text := old.text;
        new.created_at := old.created_at;
        if old.status <> 'pending' then
            new.status := old.status;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_soma_whispers on public.soma_whispers;
create trigger trg_guard_soma_whispers
    before update on public.soma_whispers
    for each row execute function public.guard_soma_whispers();

-- 8. Private ownership: never infer it from client-supplied post IDs or Telegram data.
create schema if not exists soma_private;
revoke all on schema soma_private from public, anon, authenticated;
create table if not exists soma_private.post_owners (
    post_id text primary key references public.soma_posts(id) on delete cascade,
    owner_id uuid not null
);
-- Defense in depth: no client policies; only owner-executed helper functions access it.
alter table soma_private.post_owners enable row level security;
revoke all on soma_private.post_owners from public, anon, authenticated;
create or replace function public.capture_soma_post_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is not null then
        insert into soma_private.post_owners values (new.id, auth.uid());
    end if;
    return new;
end;
$$;
revoke all on function public.capture_soma_post_owner() from public;
drop trigger if exists trg_soma_post_owner on public.soma_posts;
create trigger trg_soma_post_owner after insert on public.soma_posts
for each row execute function public.capture_soma_post_owner();

create or replace function public.owns_soma_post(p_id text)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists(select 1 from soma_private.post_owners
                  where post_id = p_id and owner_id = auth.uid());
$$;
revoke all on function public.owns_soma_post(text) from public;
grant execute on function public.owns_soma_post(text) to authenticated;

alter table public.soma_whispers add column if not exists sender_auth_id uuid default auth.uid();
create unique index if not exists soma_whispers_auth_post_idx
on public.soma_whispers(post_id, sender_auth_id);
create index if not exists soma_whispers_auth_created_idx
on public.soma_whispers(sender_auth_id, created_at);
-- Legacy rows without verified identities are deliberately inaccessible.
drop policy if exists "soma_whispers_select" on public.soma_whispers;
drop policy if exists "soma_whispers_insert" on public.soma_whispers;
drop policy if exists "soma_whispers_update_status" on public.soma_whispers;
create policy "soma_whispers_select" on public.soma_whispers
for select to authenticated using (
    sender_auth_id = auth.uid() or public.owns_soma_post(post_id)
);
create policy "soma_whispers_insert" on public.soma_whispers
for insert to authenticated with check (
    sender_auth_id = auth.uid() and status = 'pending'
    and not public.owns_soma_post(post_id)
);
create policy "soma_whispers_update_status" on public.soma_whispers
for update to authenticated using (public.owns_soma_post(post_id) and status = 'pending')
with check (public.owns_soma_post(post_id) and status in ('saved', 'dismissed'));

-- Column privileges prevent recipients from learning sender identity.
revoke all on public.soma_whispers from anon, authenticated;
grant select (id, post_id, post_tag, post_preview, text, status, created_at)
on public.soma_whispers to authenticated;
grant insert (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at)
on public.soma_whispers to authenticated;
grant update (status) on public.soma_whispers to authenticated;

create or replace function public.guard_soma_whispers()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if tg_op = 'INSERT' then
        if auth.uid() is null then raise exception 'Authentication required'; end if;
        -- Serialize concurrent sends from the same authenticated session.
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
        new.sender_auth_id := auth.uid();
        new.created_at := now();
        if not exists(select 1 from soma_private.post_owners where post_id = new.post_id) then
            raise exception 'Post has no verified recipient';
        end if;
        if public.owns_soma_post(new.post_id) then raise exception 'Cannot whisper to yourself'; end if;
        if (select count(*) from public.soma_whispers where sender_auth_id = auth.uid()
            and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') >= 3 then
            raise exception 'Daily whisper limit reached';
        end if;
    else
        if not public.owns_soma_post(old.post_id) or old.status <> 'pending'
           or new.status not in ('saved', 'dismissed') then
            raise exception 'Invalid whisper transition';
        end if;
        new.id := old.id; new.post_id := old.post_id;
        new.post_tag := old.post_tag; new.post_preview := old.post_preview;
        new.sender_uid := old.sender_uid; new.sender_auth_id := old.sender_auth_id;
        new.text := old.text; new.created_at := old.created_at;
    end if;
    return new;
end;
$$;
drop trigger if exists trg_guard_soma_whispers on public.soma_whispers;
create trigger trg_guard_soma_whispers before insert or update on public.soma_whispers
for each row execute function public.guard_soma_whispers();

create or replace function public.my_saved_soma_whispers()
returns table(id text, status text) language sql stable security definer set search_path = '' as $$
    select w.id, w.status from public.soma_whispers w
    where w.sender_auth_id = auth.uid() and w.status = 'saved'
    order by w.created_at desc;
$$;
revoke all on function public.my_saved_soma_whispers() from public;
grant execute on function public.my_saved_soma_whispers() to authenticated;

commit;

-- >>> STEP 2: private witness marks (setup_witness_marks.sql)
-- Anonymous, nonverbal presence marks for public stories.
-- Requires Auth-backed post ownership from billing/setup_stars.sql.
begin;

-- The feed no longer exposes or updates legacy engagement counters. Keep the
-- old columns for compatibility, but make only the story/profile fields used by
-- the current client readable through PostgREST.
revoke select on table public.soma_posts from public, anon, authenticated;
revoke select (likes) on table public.soma_posts from public, anon, authenticated;
grant select (id, author, tag, text, created_at)
    on table public.soma_posts to anon, authenticated;
revoke update on table public.soma_posts from public, anon, authenticated;
revoke update (likes) on table public.soma_posts from public, anon, authenticated;
drop policy if exists "soma_posts_update_likes" on public.soma_posts;

revoke select on table public.soma_users from public, anon, authenticated;
revoke select (seen, reacts) on table public.soma_users from public, anon, authenticated;
grant select (username, xp, warmth, help_attempts, whispers_sent,
              weekly_xp, weekly_key, cosmetics, owned_cosmetics)
    on table public.soma_users to anon, authenticated;

-- Keep the legacy counters from being re-populated by stale clients. The
-- current app writes only these profile columns; service-role routines remain
-- unaffected by the client grants below.
revoke insert on table public.soma_users from public, anon, authenticated;
revoke update on table public.soma_users from public, anon, authenticated;
revoke insert (seen, reacts) on table public.soma_users from public, anon, authenticated;
revoke update (seen, reacts) on table public.soma_users from public, anon, authenticated;
grant insert (username, xp, help_attempts)
    on table public.soma_users to anon, authenticated;
grant update (xp, warmth, help_attempts, weekly_xp, weekly_key, cosmetics, owned_cosmetics)
    on table public.soma_users to anon, authenticated;

create schema if not exists soma_private;
revoke all on schema soma_private from public, anon, authenticated;

create table if not exists soma_private.post_witness_marks (
    post_id text not null references public.soma_posts(id) on delete cascade,
    reader_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (post_id, reader_id)
);

-- Link the anonymous app profile to the unforgeable Auth owner only inside the
-- private schema. This lets a server-side mark reward the author, even offline.
alter table soma_private.post_owners
    add column if not exists profile_uid text;

create table if not exists soma_private.user_profile_bindings (
    auth_id uuid primary key,
    profile_uid text not null check (profile_uid ~ '^u_[0-9a-f]{4,32}$')
);

create table if not exists soma_private.witness_author_warmth (
    author_id uuid primary key,
    total_warmth integer not null default 0 check (total_warmth >= 0),
    synced_warmth integer not null default 0 check (synced_warmth >= 0 and synced_warmth <= total_warmth)
);

create index if not exists soma_post_witness_reader_created_idx
    on soma_private.post_witness_marks (reader_id, created_at desc);

alter table soma_private.post_witness_marks enable row level security;
alter table soma_private.user_profile_bindings enable row level security;
alter table soma_private.witness_author_warmth enable row level security;
revoke all on soma_private.post_witness_marks from public, anon, authenticated;
revoke all on soma_private.user_profile_bindings from public, anon, authenticated;
revoke all on soma_private.witness_author_warmth from public, anon, authenticated;

-- Capture the profile key into private ownership metadata; it never becomes a
-- selectable column on soma_posts or a public field in the witness RPC.
create or replace function public.capture_soma_post_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_profile_uid text;
begin
    if auth.uid() is not null then
        select b.profile_uid into v_profile_uid
          from soma_private.user_profile_bindings b
         where b.auth_id = auth.uid();
        insert into soma_private.post_owners (post_id, owner_id, profile_uid)
        values (new.id, auth.uid(), v_profile_uid);
    end if;
    return new;
end;
$$;
revoke all on function public.capture_soma_post_owner() from public;

-- Called after the app has created/loaded its anonymous profile row. On first
-- use this also backfills existing Auth-owned posts and any offline mark warmth.
create or replace function public.bind_my_soma_profile(p_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_bound text;
    v_pending integer := 0;
    v_updated integer := 0;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if p_username is null or p_username !~ '^u_[0-9a-f]{4,32}$' then
        raise exception 'Invalid profile';
    end if;
    if not exists (select 1 from public.soma_users u where u.username = p_username) then
        raise exception 'Profile not found';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-witness-owner:' || auth.uid()::text, 1)
    );
    insert into soma_private.user_profile_bindings (auth_id, profile_uid)
    values (auth.uid(), p_username)
    on conflict (auth_id) do nothing;
    select b.profile_uid into v_bound
      from soma_private.user_profile_bindings b where b.auth_id = auth.uid();
    if v_bound is distinct from p_username then raise exception 'Profile binding mismatch'; end if;

    update soma_private.post_owners
       set profile_uid = p_username
     where owner_id = auth.uid() and profile_uid is null;

    select greatest(w.total_warmth - w.synced_warmth, 0)
      into v_pending
      from soma_private.witness_author_warmth w
     where w.author_id = auth.uid();
    if coalesce(v_pending, 0) > 0 then
        update public.soma_users set warmth = warmth + v_pending
         where username = p_username;
        get diagnostics v_updated = row_count;
        if v_updated = 1 then
            update soma_private.witness_author_warmth
               set synced_warmth = total_warmth
             where author_id = auth.uid();
        end if;
    end if;
    return true;
end;
$$;
revoke all on function public.bind_my_soma_profile(text) from public, anon, authenticated;
grant execute on function public.bind_my_soma_profile(text) to authenticated;

-- Returns true only when this Auth identity creates a new mark; false means it
-- already marked the story. The reader identity is never returned to clients.
create or replace function public.mark_soma_post_witness(p_post_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reader uuid := auth.uid();
    v_owner uuid;
    v_profile_uid text;
    v_added integer := 0;
    v_updated integer := 0;
    v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
    if v_reader is null then
        raise exception 'Authentication required';
    end if;

    if p_post_id is null or p_post_id !~ '^[A-Za-z0-9_-]{4,48}$' then
        raise exception 'Invalid post id';
    end if;

    select o.owner_id, o.profile_uid
      into v_owner, v_profile_uid
      from public.soma_posts p
      join soma_private.post_owners o on o.post_id = p.id
     where p.id = p_post_id;

    if not found then
        raise exception 'Post is not available for witness marks';
    end if;
    if v_owner = v_reader then
        raise exception 'Cannot mark own post';
    end if;

    -- Serialize a reader's daily limit check; the unique key separately makes
    -- repeated taps and concurrent duplicate requests idempotent.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-post-witness:' || v_reader::text, 0)
    );

    if exists (
        select 1
          from soma_private.post_witness_marks m
         where m.post_id = p_post_id and m.reader_id = v_reader
    ) then
        return false;
    end if;

    if (
        select count(*)
          from soma_private.post_witness_marks m
         where m.reader_id = v_reader and m.created_at >= v_day_start
    ) >= 30 then
        raise exception 'Daily witness mark limit reached';
    end if;

    -- Serialize rewards for one author as well as the reader-side duplicate/cap check.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-witness-owner:' || v_owner::text, 1)
    );

    insert into soma_private.post_witness_marks (post_id, reader_id)
    values (p_post_id, v_reader)
    on conflict (post_id, reader_id) do nothing;
    get diagnostics v_added = row_count;

    if v_added = 1 then
        -- Queue the reward by Auth owner first so an offline/unbound author's
        -- +2 is not lost; profile binding syncs it on their next app visit.
        insert into soma_private.witness_author_warmth (author_id, total_warmth, synced_warmth)
        values (v_owner, 2, 0)
        on conflict (author_id) do update
           set total_warmth = soma_private.witness_author_warmth.total_warmth + 2;

        if v_profile_uid is not null then
            update public.soma_users
               set warmth = warmth + 2
             where username = v_profile_uid;
            get diagnostics v_updated = row_count;
            if v_updated = 1 then
                update soma_private.witness_author_warmth
                   set synced_warmth = total_warmth
                 where author_id = v_owner;
            end if;
        end if;
    end if;
    return v_added = 1;
end;
$$;

revoke all on function public.mark_soma_post_witness(text) from public, anon, authenticated;
grant execute on function public.mark_soma_post_witness(text) to authenticated;
comment on function public.mark_soma_post_witness(text) is
    'Creates one anonymous presence mark per authenticated reader and verified public story; awards +2 author warmth server-side and returns only whether this call inserted a new mark.';

-- An authenticated viewer can ask about at most 50 public post IDs. Authors
-- learn only whether at least one mark exists for their own post. Other readers
-- learn only whether they personally already marked it. No names, counts, or
-- reader identities leave the private schema.
drop function if exists public.my_soma_post_witness_status(text[]);
create function public.my_soma_post_witness_status(p_post_ids text[])
returns table (
    post_id text,
    is_author boolean,
    can_mark boolean,
    has_witness boolean,
    i_marked boolean,
    author_warmth integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_reader uuid := auth.uid();
begin
    if v_reader is null then
        raise exception 'Authentication required';
    end if;
    if coalesce(pg_catalog.cardinality(p_post_ids), 0) > 50 then
        raise exception 'Too many post IDs';
    end if;

    return query
    select p.id,
           coalesce(o.owner_id = v_reader, false),
           (o.owner_id is not null and o.owner_id <> v_reader)
               and not exists (
                   select 1 from soma_private.post_witness_marks m
                    where m.post_id = p.id and m.reader_id = v_reader
               ),
           coalesce((o.owner_id = v_reader) and exists (
               select 1 from soma_private.post_witness_marks m
                where m.post_id = p.id
           ), false),
           coalesce((o.owner_id <> v_reader) and exists (
               select 1 from soma_private.post_witness_marks m
                where m.post_id = p.id and m.reader_id = v_reader
           ), false),
           case when o.owner_id = v_reader then (
               select u.warmth from public.soma_users u where u.username = o.profile_uid
           ) else null::integer end
      from (
          select distinct requested.id
            from pg_catalog.unnest(coalesce(p_post_ids, array[]::text[])) as requested(id)
           where requested.id ~ '^[A-Za-z0-9_-]{4,48}$'
      ) requested
      join public.soma_posts p on p.id = requested.id
      left join soma_private.post_owners o on o.post_id = p.id
     order by p.id;
end;
$$;

revoke all on function public.my_soma_post_witness_status(text[]) from public, anon, authenticated;
grant execute on function public.my_soma_post_witness_status(text[]) to authenticated;
comment on function public.my_soma_post_witness_status(text[]) is
    'Authors see only a boolean presence state and their own warmth; readers see only their own mark state. No identity or mark count is returned.';

commit;

-- >>> STEP 3: station atmosphere (setup_station_presence.sql)
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

-- >>> STEP 4: pager (setup_pager.sql)
-- One anonymous story at a time, with durable per-reader decisions.
-- Apply after setup_witness_marks.sql.
begin;
create table if not exists soma_private.pager_decisions (
    reader_id uuid not null,
    post_id text not null references public.soma_posts(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (reader_id, post_id)
);
create table if not exists soma_private.pager_current (
    reader_id uuid primary key,
    post_id text not null references public.soma_posts(id) on delete cascade
);
alter table soma_private.pager_decisions enable row level security;
alter table soma_private.pager_current enable row level security;
revoke all on soma_private.pager_decisions, soma_private.pager_current from public, anon, authenticated;

create or replace function public.next_soma_pager_story()
returns table(id text, author text, tag text, text text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    select c.post_id into v_id from soma_private.pager_current c
     join soma_private.post_owners o on o.post_id = c.post_id
     where c.reader_id = auth.uid() and o.owner_id <> auth.uid()
       and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = c.post_id);
    if v_id is null then
        delete from soma_private.pager_current where reader_id = auth.uid();
        select p.id into v_id from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where o.owner_id <> auth.uid()
           and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = p.id)
         order by random() limit 1;
        if v_id is not null then
            insert into soma_private.pager_current(reader_id, post_id) values (auth.uid(), v_id);
        end if;
    end if;
    return query select p.id, p.author, p.tag, p.text, p.created_at from public.soma_posts p where p.id = v_id;
end;
$$;
create or replace function public.decide_soma_pager_story(p_post_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    if exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = p_post_id) then
        return false;
    end if;
    if not exists (select 1 from soma_private.pager_current c where c.reader_id = auth.uid() and c.post_id = p_post_id) then
        raise exception 'Story is not current';
    end if;
    insert into soma_private.pager_decisions(reader_id, post_id) values (auth.uid(), p_post_id);
    delete from soma_private.pager_current where reader_id = auth.uid();
    return true;
end;
$$;
-- Owners can still see their own stories and anonymous witness notes separately.
create or replace function public.my_soma_pager_stories()
returns table(id text, author text, tag text, text text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    return query select p.id, p.author, p.tag, p.text, p.created_at from public.soma_posts p
      join soma_private.post_owners o on o.post_id = p.id
     where o.owner_id = auth.uid() order by p.created_at desc limit 30;
end;
$$;
revoke all on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() from public, anon;
grant execute on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() to authenticated;
commit;

-- >>> STEP 5: anonymous room + greenhouse visits (setup_room_visits.sql)
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

-- ==== END OF FULL SETUP ====
