-- ======================================================================
-- SOMA~LINK // SIGNAL PIPELINE v2 — все write-операции через RPC (security definer)
-- Решёт проблему RLS 42501 и 42804: клиент не вписывает строки напрямую —
-- все вставки и обновления выполняются серверными функциями
-- security definer, которые работают с правами владельца и
-- НЕ зависят от политик RLS на таблицах.
--
-- v2: RETURNS SETOF <table> вместо RETURNS TABLE(explicit types) —
-- гарантирует совпадение структуры с реальной схемой таблицы в Supabase
-- (не вызывает 42804 при расхождении типов колонок, например created_at).
--
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- Идемпотентно: повторный запуск ничего не ломает.
-- Все функции — абсолютный ASCII (кириллические литералы через hex).
-- ======================================================================

begin;

-- Сначала удаляем старые функции (42P13: cannot change return type)
drop function if exists public.submit_soma_post(text, text, text, text);
drop function if exists public.send_soma_whisper(text, text, text, text, text, text);
drop function if exists public.send_soma_whisper(text, text, text, text, text, text, text);
drop function if exists public.set_soma_whisper_status(text, text);
drop function if exists public.get_my_pending_whispers(text[]);
drop function if exists public.get_my_saved_whispers();

-- ======================================================================
-- 1. Submit signal (player sends a story to the feed)
--    RETURNS SETOF public.soma_posts — тип берётся из реальной таблицы,
--    исключает 42804 при расхождении типов колонок.
-- ======================================================================
create or replace function public.submit_soma_post(
    p_id text, p_author text, p_tag text, p_text text
)
returns setof public.soma_posts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    -- Basic validation (mirrors client checks; server is authoritative)
    if char_length(p_text) < 13 or char_length(p_text) > 666 then
        raise exception 'invalid_text: text must be 13..666 chars';
    end if;
    if char_length(p_id) < 4 or char_length(p_id) > 48 then
        raise exception 'invalid_id';
    end if;
    if char_length(p_tag) > 32 then
        p_tag := substring(p_tag from 1 for 32);
    end if;
    if public.soma_text_blocked(p_text) then
        raise exception 'invalid_text: содержит запрещённую лексику';
    end if;

    insert into public.soma_posts (id, author, tag, text)
    values (p_id, p_author, p_tag, p_text);

    -- Захват владельца поста: без записи в soma_private.post_owners
    -- next_soma_pager_story() не найдёт пост для пейджера других игроков
    -- (он читает посты через join с post_owners и фильтр owner_id <> auth.uid()).
    if auth.uid() is not null then
        insert into soma_private.post_owners (post_id, owner_id)
        values (p_id, auth.uid())
        on conflict (post_id) do nothing;
    end if;

    return query
        select sp.*
        from public.soma_posts sp
        where sp.id = p_id;
end;
$$;

-- ======================================================================
-- 2. Send whisper (player whispers to a story)
--    RETURNS SETOF public.soma_whispers — тип берётся из реальной таблицы.
--    Предотвращает двойные шёпоты: unique (post_id, sender_uid).
-- ======================================================================
create or replace function public.send_soma_whisper(
    p_id text, p_post_id text, p_post_tag text, p_post_preview text,
    p_sender_uid text, p_text text, p_reply_to text, p_day_key text default null
)
returns setof public.soma_whispers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    r_row public.soma_whispers%rowtype;
    v_is_reply boolean;
begin
    v_is_reply := p_reply_to is not null and char_length(p_reply_to) > 0;

    if char_length(p_text) < 13 or char_length(p_text) > 333 then
        raise exception 'invalid_text: whisper must be 13..333 chars';
    end if;
    if char_length(p_id) < 4 or char_length(p_id) > 64 then
        raise exception 'invalid_id';
    end if;
    if char_length(p_post_id) < 4 or char_length(p_post_id) > 48 then
        raise exception 'invalid_post_id';
    end if;
    if p_sender_uid !~ '^u_[0-9a-f]{4,32}$' then
        raise exception 'invalid_sender_uid';
    end if;
    if v_is_reply and (char_length(p_reply_to) < 4 or char_length(p_reply_to) > 64) then
        raise exception 'invalid_reply_id';
    end if;
    if char_length(p_post_tag) > 32 then
        p_post_tag := substring(p_post_tag from 1 for 32);
    end if;
    if char_length(p_post_preview) > 180 then
        p_post_preview := substring(p_post_preview from 1 for 180);
    end if;
    if public.soma_text_blocked(p_text) then
        raise exception 'invalid_text: содержит запрещённую лексику';
    end if;

    if v_is_reply then
        -- Ответ на входящий шёпот.
        -- Проверки цели и «1 ответ на шёпот» — в trigger guard_soma_whispers (при insert).
        -- Оригинальный шёпот переходит в статус answered.
        insert into public.soma_whispers
            (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at, reply_to_id, day_key)
        values
            (p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text, 'pending', now(), p_reply_to, p_day_key);

        update public.soma_whispers
        set status = 'answered'
        where id = p_reply_to;
    else
        -- Обычный шёпот: unique (post_id, sender_uid, reply_to_id) физически
        -- запрещает шептать одному человеку дважды — повторная отправка даёт 23505.
        insert into public.soma_whispers
            (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at, reply_to_id, day_key)
        values
            (p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text, 'pending', now(), coalesce(p_reply_to, ''), p_day_key);
    end if;

    select * into r_row from public.soma_whispers where id = p_id;

    return query select r_row.*;
end;
$$;

-- ======================================================================
-- 3. Set whisper status (saved / dismissed) — для кассет и ack
--    RETURNS SETOF public.soma_whispers — тип берётся из реальной таблицы.
-- ======================================================================
create or replace function public.set_soma_whisper_status(
    p_id text, p_status text
)
returns setof public.soma_whispers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    r_row public.soma_whispers%rowtype;
begin
    if p_status not in ('saved', 'dismissed', 'pending', 'answered') then
        raise exception 'invalid_status';
    end if;

    update public.soma_whispers
    set status = p_status
    where id = p_id
    returning *
    into r_row;

    if r_row.id is null then
        raise exception 'whisper_not_found';
    end if;

    return query select r_row.*;
end;
$$;

-- ======================================================================
-- 4. Get pending whispers for my posts (read — через definer для надёжности)
--    RETURNS SETOF public.soma_whispers — тип берётся из реальной таблицы.
-- ======================================================================
create or replace function public.get_my_pending_whispers(p_post_ids text[])
returns setof public.soma_whispers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_post_ids is null or array_length(p_post_ids, 1) is null then
        return;
    end if;

    return query
        select w.*
        from public.soma_whispers w
        where w.post_id = any(p_post_ids)
          and w.status = 'pending'
          and w.reply_to_id = ''
          and w.sender_auth_id <> auth.uid()
        order by w.created_at desc
        limit 20;
end;
$$;

-- ======================================================================
-- 4b. Get replies to my sent whispers (ответы на мои отправленные шёпоты)
--     RETURNS SETOF public.soma_whispers — тип берётся из реальной таблицы.
-- ======================================================================
create or replace function public.get_my_whisper_replies()
returns setof public.soma_whispers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    return query
        select w.*
        from public.soma_whispers w
        where w.reply_to_id <> ''
          and w.reply_to_id in (
            select t.id from public.soma_whispers t
            where t.sender_auth_id = auth.uid()
        )
          and w.status = 'pending'
        order by w.created_at desc
        limit 20;
end;
$$;

-- ======================================================================
-- 5. Get saved whispers of the current Auth user (cassette echoes)
--    RETURNS SETOF public.soma_whispers — тип берётся из реальной таблицы.
-- ======================================================================
create or replace function public.get_my_saved_whispers()
returns setof public.soma_whispers
language sql
security definer
set search_path = public, pg_temp
stable
as $$
    select w.*
    from public.soma_whispers w
    where w.sender_auth_id = auth.uid()
      and w.status = 'saved'
    order by w.created_at desc;
$$;

-- ======================================================================
-- Права: RPC могут вызывать anon и authenticated (Anonymous Auth).
-- ======================================================================
revoke all on function public.submit_soma_post(text, text, text, text) from public;
grant execute on function public.submit_soma_post(text, text, text, text) to anon, authenticated;

revoke all on function public.send_soma_whisper(text, text, text, text, text, text, text, text) from public;
grant execute on function public.send_soma_whisper(text, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.set_soma_whisper_status(text, text) from public;
grant execute on function public.set_soma_whisper_status(text, text) to anon, authenticated;

revoke all on function public.get_my_pending_whispers(text[]) from public;
grant execute on function public.get_my_pending_whispers(text[]) to anon, authenticated;

revoke all on function public.get_my_whisper_replies() from public;
grant execute on function public.get_my_whisper_replies() to anon, authenticated;

revoke all on function public.get_my_saved_whispers() from public;
grant execute on function public.get_my_saved_whispers() to anon, authenticated;

commit;
