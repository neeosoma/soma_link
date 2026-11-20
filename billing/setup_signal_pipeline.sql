-- ======================================================================
-- SOMA~LINK // SIGNAL PIPELINE — все write-операции через RPC (service_role)
-- Решёт проблему RLS 42501: клиент не вписывает строки напрямую —
-- все вставки и обновления выполняются серверными функциями
-- security definer, которые работают с правами владельца и
-- НЕ зависят от политик RLS на таблицах.
--
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- Идемпотентно: повторный запуск ничего не ломает.
-- Все функции — абсолютный ASCII (кириллические литералы через hex).
-- ======================================================================

begin;

-- ======================================================================
-- 1. Submit signal (player sends a story to the feed)
--    Возвращает строку с созданным постом (id, author, tag, text).
-- ======================================================================
create or replace function public.submit_soma_post(
    p_id text, p_author text, p_tag text, p_text text
)
returns table(id text, author text, tag text, "text" text, created_at timestamptz)
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

    insert into public.soma_posts (id, author, tag, text)
    values (p_id, p_author, p_tag, p_text);

    return query
        select sp.id, sp.author, sp.tag, sp."text", sp.created_at
        from public.soma_posts sp
        where sp.id = p_id;
end;
$$;

-- ======================================================================
-- 2. Send whisper (player whispers to a story)
--    Возвращает созданный шёпот (id, post_id, sender_uid, text, status).
--    Предотвращает двойные шёпоты: unique (post_id, sender_uid).
-- ======================================================================
create or replace function public.send_soma_whisper(
    p_id text, p_post_id text, p_post_tag text, p_post_preview text,
    p_sender_uid text, p_text text
)
returns table(o_id text, o_post_id text, o_sender_uid text, o_text text, o_status text, o_created timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    r_row public.soma_whispers%rowtype;
begin
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
    if char_length(p_post_tag) > 32 then
        p_post_tag := substring(p_post_tag from 1 for 32);
    end if;
    if char_length(p_post_preview) > 180 then
        p_post_preview := substring(p_post_preview from 1 for 180);
    end if;

    insert into public.soma_whispers
        (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at)
    values
        (p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text, 'pending', now())
    on conflict (post_id, sender_uid) do update
        set text = excluded.text, status = 'pending', created_at = now();

    select * into r_row from public.soma_whispers where id = p_id;

    return query select r_row.id as o_id, r_row.post_id as o_post_id, r_row.sender_uid as o_sender_uid,
        r_row."text" as o_text, r_row.status as o_status, r_row.created_at as o_created;
end;
$$;

-- ======================================================================
-- 3. Set whisper status (saved / dismissed) — для кассет и ack
--    Возвращает обновлённую строку (id, status).
-- ======================================================================
create or replace function public.set_soma_whisper_status(
    p_id text, p_status text
)
returns table(o_id text, o_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_id text;
    v_status text;
begin
    if p_status not in ('saved', 'dismissed', 'pending') then
        raise exception 'invalid_status';
    end if;

    update public.soma_whispers
    set status = p_status
    where id = p_id
    returning id, status
    into v_id, v_status;

    if v_id is null then
        raise exception 'whisper_not_found';
    end if;

    return query select v_id as o_id, v_status as o_status;
end;
$$;

-- ======================================================================
-- 4. Get pending whispers for my posts (read — через definer для надёжности)
-- ======================================================================
create or replace function public.get_my_pending_whispers(p_post_ids text[])
returns table(o_id text, o_post_id text, o_post_tag text, o_post_preview text, o_text text, o_created timestamptz, o_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_post_ids is null or array_length(p_post_ids, 1) is null then
        return;
    end if;

    return query
        select w.id as o_id, w.post_id as o_post_id, w.post_tag as o_post_tag,
               w.post_preview as o_post_preview, w.text as o_text,
               w.created_at as o_created, w.status as o_status
        from public.soma_whispers w
        where w.post_id = any(p_post_ids)
          and w.status = 'pending'
        order by w.created_at desc
        limit 20;
end;
$$;

-- ======================================================================
-- 5. Get saved whispers of the current Auth user (cassette echoes)
--    (дубликат my_saved_soma_whispers — для надёжности pipeline)
-- ======================================================================
create or replace function public.get_my_saved_whispers()
returns table(id text, status text, created_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
    select w.id, w.status, w.created_at
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

revoke all on function public.send_soma_whisper(text, text, text, text, text, text) from public;
grant execute on function public.send_soma_whisper(text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.set_soma_whisper_status(text, text) from public;
grant execute on function public.set_soma_whisper_status(text, text) to anon, authenticated;

revoke all on function public.get_my_pending_whispers(text[]) from public;
grant execute on function public.get_my_pending_whispers(text[]) to anon, authenticated;

revoke all on function public.get_my_saved_whispers() from public;
grant execute on function public.get_my_saved_whispers() to anon, authenticated;

commit;
