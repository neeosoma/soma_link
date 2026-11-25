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
    add column if not exists owned_cosmetics text[] not null default '{}'::text[],
    add column if not exists created_at timestamptz not null default now();

create index if not exists soma_users_xp_idx
    on public.soma_users (xp desc);

create index if not exists soma_users_weekly_idx
    on public.soma_users (weekly_key, weekly_xp desc);

-- 2. Таблица «Ленты боли» (ФИЗИЧЕСКИ БЕЗ ID АВТОРА — 100% анонимность!)
-- cosmetics: выбранные отправителем отражаемые атрибуты сигнала
-- ({"seal":true,"title":false,"frame":true}) — приходят получателям на пейджер.
create table if not exists public.soma_posts (
    id text primary key check (char_length(id) between 4 and 48),
    author text not null default 'Аноним' check (char_length(author) <= 32),
    tag text not null default 'ЛИЧНАЯ БОЛЬ' check (char_length(tag) <= 32),
    text text not null check (char_length(text) between 13 and 666),
    likes integer not null default 0 check (likes >= 0),
    cosmetics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Идемпотентная миграция: добавляем колонку, если таблица уже существовала без неё.
alter table public.soma_posts add column if not exists cosmetics jsonb not null default '{}'::jsonb;

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
        new.cosmetics := old.cosmetics;
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
-- Ответ на входящий шёпот: ссылается на id того входящего шёпота, на который отвечаем.
-- Ответы не проверяются в guard_soma_whispers по дневному лимиту (его нет).
-- Сентинель «нет ответа» — пустая строка (не NULL): так уникальный индекс
-- (post_id, sender_uid, reply_to_id) работает для всех строк и ON CONFLICT инферится.
alter table public.soma_whispers add column if not exists reply_to_id text not null default '';
-- Локальный день игрока в day_key (YYYY-MM-DD): клиент передаёт свой день,
-- trigger default-ит в UTC-день для прямого INSERT (тесты/миграции). Хранится для записей о шёпотах.
alter table public.soma_whispers add column if not exists day_key text;
-- Разрешаем статус «answered» (оригинальный шёпот, на который пришёл ответ).
alter table public.soma_whispers drop constraint if exists soma_whispers_status_check;
alter table public.soma_whispers add constraint soma_whispers_status_check
    check (status in ('pending', 'saved', 'dismissed', 'answered'));
-- Unique (post_id, sender_uid) сохраняется для обычных шёпотов; ответы добавляют
-- reply_to_id в ключ — можно ответить на несколько шёпотов одного поста.
alter table public.soma_whispers drop constraint if exists soma_whispers_post_id_sender_uid_key;
create unique index if not exists soma_whispers_post_sender_uid_reply_idx
    on public.soma_whispers(post_id, sender_uid, reply_to_id);
-- Аналогично: уникальность (post_id, sender_auth_id) — только для обычных шёпотов.
drop index if exists soma_whispers_auth_post_idx;
create unique index if not exists soma_whispers_auth_post_idx
    on public.soma_whispers(post_id, sender_auth_id) where reply_to_id = '';
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
        if new.day_key is null or new.day_key = '' then
            new.day_key := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
        end if;
        if new.reply_to_id <> '' then
            -- Ответ на входящий шёпот: не проверяет владение постом.
            -- Целевой шёпот должен быть входящим: его пост принадлежит мне.
            if not exists(select 1 from public.soma_whispers t
                where t.id = new.reply_to_id
                  and public.owns_soma_post(t.post_id)) then
                raise exception 'Reply target unavailable';
            end if;
            -- Один ответ на один шёпот.
            if exists(select 1 from public.soma_whispers r
                where r.reply_to_id = new.reply_to_id
                  and r.sender_auth_id = auth.uid()) then
                raise exception 'Reply already sent';
            end if;
            -- Шёпот ещё должен быть pending (не обработан, не уже отвечен).
            if not exists(select 1 from public.soma_whispers t
                where t.id = new.reply_to_id
                  and t.status in ('pending', 'saved')) then
                raise exception 'Reply target unavailable';
            end if;
        else
            if not exists(select 1 from soma_private.post_owners where post_id = new.post_id) then
                raise exception 'Post has no verified recipient';
            end if;
            if public.owns_soma_post(new.post_id) then raise exception 'Cannot whisper to yourself'; end if;
            -- Дневного лимита на шёпоты нет: обычные шёпоты ограничены только
            -- уникальностью (один шёпот на пост для одного отправителя).
        end if;
    else
        -- Сохранённый шёпот (saved) необратим: от него зависит отклик отправителю
        -- (тепло + сообщение во входящие, my_saved_soma_whispers). Переворот в
        -- dismissed/pending отключает отклик — запрещаем.
        if not public.owns_soma_post(old.post_id) or old.status not in ('pending', 'saved')
           or new.status not in ('saved', 'dismissed', 'answered')
           or (old.status = 'saved' and new.status in ('dismissed', 'pending')) then
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
grant execute on function public.my_saved_soma_whispers() to anon, authenticated;

-- 9. Фильтр запрещённой лексики (анти-мат / токсичный текст).
--    Нормализация: приведение к строчному, удаление ВСЕХ символов кроме букв/цифр,
--    поэтому "х——у…..—-й", "х.уй", "ХУЙ" и пр. сводятся к "хуй" и попадают в фильтр.
--    Список терминов — в text[]; без сетевых запросов, проверка — подстрокой.
create or replace function public.soma_text_blocked(p_text text)
returns boolean
language plpgsql
as $$
declare
    v_clean text;
    v_lower text;
    v_term text;
begin
    if p_text is null then
        return false;
    end if;
    v_clean := regexp_replace(lower(p_text), '[^а-яёa-z0-9]', '', 'g');
    v_lower := lower(p_text);
    -- Жёсткие термины: любое вхождение в очищенной строке — блокируем.
    foreach v_term in array array[
        'хуй', 'хуя', 'хуём', 'хуев', 'хуёв', 'пидар', 'пидор', 'пидарас',
        'педераст', 'падла', 'сука', 'блядь', 'урод', 'ублюдок',
        'дурень', 'fuck', 'shit'
    ] loop
        if v_clean like '%' || v_term || '%' then
            return true;
        end if;
    end loop;
    -- Короткие термины: блокируем только как самостоятельное слово.
    -- Если в исходнике его нет в таком виде (обфускация d-ура),
    -- но он есть в очищенной строке — блокируем.
    foreach v_term in array array['блять', 'гей', 'дура'] loop
        if not (v_clean like '%' || v_term || '%') then
            continue;
        end if;
        if not (v_lower like '%' || v_term || '%') then
            -- обфускация (в исходнике термина нет) — блокируем
            return true;
        end if;
        -- ищем термин как самостоятельное слово (разделители -> пробел)
        if position(' ' || v_term || ' ' in ' ' || regexp_replace(v_lower, '[^а-яёa-z0-9]', ' ', 'g') || ' ') > 0 then
            return true;
        end if;
    end loop;
    return false;
end;
$$;

commit;
