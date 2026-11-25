-- ======================================================================
-- FIX: шёпот падал с «there is no unique or exclusion constraint matching
-- the ON CONFLICT specification»
-- Причина: в базе осталась СТАРАЯ версия RPC send_soma_whisper (с ON CONFLICT),
-- а unique-констрейнт (post_id, sender_uid), на который она ссылась,
-- был заменён на новые индексы (soma_whispers_post_sender_uid_reply_idx).
-- ON CONFLICT больше не соответствует ни одному индексу → 42P10-like ошибка.
--
-- ФIX: пересобираем RPC без ON CONFLICT (дубликат превентивно пресекается
-- уникальным индексом — клиент обрабатывает 23505), а также
-- гарантируем наличие индексов и guard-trigger.
--
-- Вставить в Supabase → SQL Editor → Run (как owner). Идемпотентно.
-- Полный перезапуск billing/setup_signal_pipeline.sql тоже решает задачу.
-- ======================================================================

begin;

-- Старые версии RPC (6-аргументная — до введения ответов на шёпоты)
drop function if exists public.send_soma_whisper(text, text, text, text, text, text);

-- Унікальные индексы (идемпотентно)
create unique index if not exists soma_whispers_post_sender_uid_reply_idx
    on public.soma_whispers(post_id, sender_uid, reply_to_id);
-- Локальный день игрока в day_key (YYYY-MM-DD): клиент передаёт свой день,
-- trigger default-ит в UTC-день для прямого INSERT. Хранится для записей о шёпотах.
alter table public.soma_whispers add column if not exists day_key text;
drop index if exists soma_whispers_auth_post_idx;
create unique index if not exists soma_whispers_auth_post_idx
    on public.soma_whispers(post_id, sender_auth_id) where reply_to_id = '';

-- Guard-trigger: проверки авторизации, цели и «1 ответ на шёпот».
create or replace function public.guard_soma_whispers()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if tg_op = 'INSERT' then
        if auth.uid() is null then raise exception 'Authentication required'; end if;
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
        new.sender_auth_id := auth.uid();
        new.created_at := now();
        if new.day_key is null or new.day_key = '' then
            new.day_key := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
        end if;
        if new.reply_to_id <> '' then
            if not exists(select 1 from public.soma_whispers t
                where t.id = new.reply_to_id
                  and public.owns_soma_post(t.post_id)) then
                raise exception 'Reply target unavailable';
            end if;
            if exists(select 1 from public.soma_whispers r
                where r.reply_to_id = new.reply_to_id
                  and r.sender_auth_id = auth.uid()) then
                raise exception 'Reply already sent';
            end if;
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
            -- Дневного лимита на шёпоты нет: ограничение — уникальность (один шёпот на пост).
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

-- Триггер: при сохранении шёпота на кассету (status → saved) зачислять тепло
-- отправителю СЕРВЕРНО — не зависит от клиентской polling и от того, остаётся
-- ли статус saved (ответ recipient переключает его в answered и убил бы отклик).
-- Колонка soma_users.ledger добавляется fix_cross_device_sync.sql — проверка
-- на её наличие делает триггер совместимым со схемами, где её ещё нет.
create or replace function public.credit_soma_whisper_saved_ack()
returns trigger
language plpgsql
as $$
declare
    v_has_ledger boolean;
    v_ledger jsonb;
    v_today text;
    v_ack_day text;
    v_total int;
    v_remaining int;
    v_grant int;
    v_acks int;
begin
    if new.status = 'saved' and old.status is distinct from 'saved' then
        v_today := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
        select exists(
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'soma_users' and column_name = 'ledger'
        ) into v_has_ledger;
        v_grant := 0;
        if v_has_ledger then
            select coalesce(ledger, '{}'::jsonb) into v_ledger
            from public.soma_users where username = new.sender_uid;
            v_ack_day := coalesce(v_ledger->>'whisperAckDay', '');
            if v_ack_day is distinct from v_today then
                v_total := coalesce((v_ledger->>'total')::int, 0);
                v_remaining := greatest(0, 6 - v_total);
                v_grant := least(4, v_remaining);
            end if;
        else
            v_grant := 4;
        end if;
        if v_grant > 0 then
            if v_has_ledger then
                v_acks := coalesce((v_ledger->>'whisperAcks')::int, 0) + 1;
                execute $q$
                    update public.soma_users
                    set warmth = warmth + $1,
                        ledger = jsonb_set(jsonb_set(jsonb_set(
                            $2,
                            '{total}', to_jsonb(coalesce(($2->>'total')::int, 0) + $1)),
                            '{whisperAcks}', to_jsonb($3)),
                            '{whisperAckDay}', to_jsonb($4))
                    where username = $5
                $q$ using v_grant, v_ledger, v_acks, v_today, new.sender_uid;
            else
                update public.soma_users set warmth = warmth + v_grant
                where username = new.sender_uid;
            end if;
        end if;
    end if;
    return new;
exception
    when insufficient_privilege then
        -- Триггер выполняется под ролью DML (не SECURITY DEFINER): если роли нет
        -- прав на soma_users — тепло не зачисляем, но сохранение шёпота не роняем
        -- (в продакшене DML идёт через SECURITY DEFINER RPC — права есть).
        return new;
end;
$$;
drop trigger if exists trg_soma_whisper_saved_ack on public.soma_whispers;
create trigger trg_soma_whisper_saved_ack
    after update on public.soma_whispers
    for each row execute function public.credit_soma_whisper_saved_ack();

-- Текущая версия RPC — без ON CONFLICT (дубликат пресекается уникальным индексом,
-- клиент обрабатывает 23505 как «уже поддержали»).
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
        insert into public.soma_whispers
            (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at, reply_to_id, day_key)
        values
            (p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text, 'pending', now(), p_reply_to, p_day_key);

        update public.soma_whispers
        set status = 'answered'
        where id = p_reply_to;
    else
        -- Обычный шёпот: уникальный индекс (post_id, sender_uid, reply_to_id)
        -- физически запрещает шептать одному человеку дважды — повтор даёт 23505.
        insert into public.soma_whispers
            (id, post_id, post_tag, post_preview, sender_uid, text, status, created_at, reply_to_id, day_key)
        values
            (p_id, p_post_id, p_post_tag, p_post_preview, p_sender_uid, p_text, 'pending', now(), coalesce(p_reply_to, ''), p_day_key);
    end if;

    select * into r_row from public.soma_whispers where id = p_id;

    return query select r_row.*;
end;
$$;

revoke all on function public.send_soma_whisper(text, text, text, text, text, text, text, text) from public;
grant execute on function public.send_soma_whisper(text, text, text, text, text, text, text, text) to anon, authenticated;

commit;
