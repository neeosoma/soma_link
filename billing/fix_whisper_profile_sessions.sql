-- =====================================================================
-- FIX: Оповещения кассет (ack) и сохранение шёпота на кассету не работали
-- после смены сеанса в Telegram Web (очистка кэша).
--
-- Причина: профиль может быть привязан к НЕСКОЛЬКИМ auth-ID (старый сеанс,
-- новый сеанс после очистки кэша, ноут). Шёпоты и посты принадлежат
-- старому сеансу, но RPC фильтровали строго sender_auth_id = auth.uid()
-- (текущий сеанс). Новый сеанс поэтому:
--   - не видел saved-шёпотов профиля → не получал оповещения кассет и тепло;
--   - не считался владельцем постов → guard_soma_whispers падал на
--     «Invalid whisper transition» при сохранении шёпота на кассету.
--
-- Fix: ввести my_profile_auth_ids() — все auth-ID, привязанные к текущему
-- профилю (через soma_private.user_profile_bindings). Использовать его в
-- owns_soma_post, my_saved_soma_whispers, get_my_saved_whispers,
-- get_my_whisper_replies, get_my_pending_whispers, guard_soma_whispers,
-- блокировках шёпота. Идемпотентно.
-- =====================================================================

-- 1. Helper: все auth-ID профиля текущего сеанса (включая сеанс, даже если
--    привязки пока нет — тогда пустой массив, т.е. «ничего не принадлежит»).
create or replace function public.my_profile_auth_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        array_agg(b.auth_id),
        '{}'::uuid[]
    )
      from soma_private.user_profile_bindings b
     where b.profile_uid = (
           select b2.profile_uid
             from soma_private.user_profile_bindings b2
            where b2.auth_id = auth.uid()
            limit 1
       );
$$;

-- 2. owns_soma_post — владелец поста по всем auth-ID профиля.
create or replace function public.owns_soma_post(p_id text)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists(select 1 from soma_private.post_owners
                  where post_id = p_id
                    and owner_id = any(public.my_profile_auth_ids()));
$$;
revoke all on function public.owns_soma_post(text) from public;
grant execute on function public.owns_soma_post(text) to authenticated;

-- 3. my_saved_soma_whispers — saved-шёпоты всего профиля ( cassette-echoes).
create or replace function public.my_saved_soma_whispers()
returns table(id text, status text)
language sql
stable
security definer
set search_path = ''
as $$
    select w.id, w.status from public.soma_whispers w
    where w.sender_auth_id = any(public.my_profile_auth_ids())
      and w.status = 'saved'
    order by w.created_at desc;
$$;
revoke all on function public.my_saved_soma_whispers() from public;
grant execute on function public.my_saved_soma_whispers() to anon, authenticated;

-- 4. get_my_saved_whispers (legacy RPC — та же логика).
create or replace function public.get_my_saved_whispers()
returns setof public.soma_whispers
language sql
security definer
set search_path = public, pg_temp
stable
as $$
    select w.*
    from public.soma_whispers w
    where w.sender_auth_id = any(public.my_profile_auth_ids())
      and w.status = 'saved'
    order by w.created_at desc;
$$;
revoke all on function public.get_my_saved_whispers() from public;
grant execute on function public.get_my_saved_whispers() to anon, authenticated;

-- 5. get_my_whisper_replies — ответы на шёпоты всего профиля.
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
            where t.sender_auth_id = any(public.my_profile_auth_ids())
        )
          and w.status = 'pending'
        order by w.created_at desc
        limit 20;
end;
$$;
revoke all on function public.get_my_whisper_replies() from public;
grant execute on function public.get_my_whisper_replies() to anon, authenticated;

-- 6. get_my_pending_whispers — исключаем шёпоты, отправленные любым сеансом
--    нашего профиля (раньше — только текущим auth.uid()).
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
          and not (w.sender_auth_id = any(public.my_profile_auth_ids()))
        order by w.created_at desc
        limit 20;
end;
$$;
revoke all on function public.get_my_pending_whispers(text[]) from public;
grant execute on function public.get_my_pending_whispers(text[]) to anon, authenticated;

-- 7. guard_soma_whispers — проверка «1 ответ на шёпот» по всем сеансам профиля.
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
                  and r.sender_auth_id = any(public.my_profile_auth_ids())) then
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

-- Триггер: ack-событие — recipient сохранил шёпот на кассету.
-- Записывается при переходе в статус saved и ОСТАЁТСЯ независимо от того,
-- останется ли статус saved (recipient может ответить и перевести шёпот в
-- answered — ack-событие не исчезает, и отправитель всё равно получает
-- сообщение). Тепло зачисляется триггером credit_soma_whisper_saved_ack.
create table if not exists public.soma_whisper_acks (
    id bigserial primary key,
    whisper_id text not null,
    sender_auth_id uuid not null,
    day_key text not null,
    created_at timestamptz not null default now(),
    unique (whisper_id, sender_auth_id)
);
grant select, insert, update on public.soma_whisper_acks to authenticated, anon;
create table if not exists public.soma_whisper_acks_read (
    ack_id bigint not null references public.soma_whisper_acks(id) on delete cascade,
    reader_auth_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (ack_id, reader_auth_id)
);
grant select, insert on public.soma_whisper_acks_read to authenticated, anon;

create or replace function public.record_soma_whisper_ack()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'saved' and old.status is distinct from 'saved' then
        insert into public.soma_whisper_acks (whisper_id, sender_auth_id, day_key)
        values (new.id, new.sender_auth_id, coalesce(new.day_key, to_char(now() at time zone 'UTC', 'YYYY-MM-DD')))
        on conflict (whisper_id, sender_auth_id) do nothing;
    end if;
    return new;
exception
    when insufficient_privilege then
        return new;
end;
$$;
drop trigger if exists trg_soma_whisper_ack_event on public.soma_whispers;
create trigger trg_soma_whisper_ack_event
    after update on public.soma_whispers
    for each row execute function public.record_soma_whisper_ack();

-- Непрочитаные ack-события отправителя (независимо от статуса шёпота).
create or replace function public.my_soma_whisper_acks()
returns table(id bigint, whisper_id text, day_key text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select a.id, a.whisper_id, a.day_key, a.created_at
    from public.soma_whisper_acks a
    where a.sender_auth_id = any(public.my_profile_auth_ids())
    and not exists (
        select 1 from public.soma_whisper_acks_read r
        where r.ack_id = a.id and r.reader_auth_id = any(public.my_profile_auth_ids())
    )
    order by a.created_at desc
    limit 20;
$$;
revoke all on function public.my_soma_whisper_acks() from public;
grant execute on function public.my_soma_whisper_acks() to anon, authenticated;

-- Отметка ack-события прочитанным (server-side read-tracking).
create or replace function public.mark_soma_whisper_ack_read(p_ack_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
    insert into public.soma_whisper_acks_read (ack_id, reader_auth_id)
    values (p_ack_id, auth.uid())
    on conflict (ack_id, reader_auth_id) do nothing;
    return true;
end;
$$;
revoke all on function public.mark_soma_whisper_ack_read(bigint) from public;
grant execute on function public.mark_soma_whisper_ack_read(bigint) to anon, authenticated;

-- 8. Блокировки шёпота: читаем/удаляем по всем auth-ID профиля, записываем
--    для всех auth-ID профиля (включая сам сеанс, если привязки нет).
create or replace function public.my_soma_whisper_blocks()
returns table(anchor_id text, created_at timestamp with time zone)
language sql
stable
security definer
set search_path = ''
as $$
    select b.anchor_id, b.created_at
    from soma_private.whisper_blocks b
    where b.recipient_id = any(public.my_profile_auth_ids())
    order by b.created_at desc;
$$;
revoke all on function public.my_soma_whisper_blocks() from public;
grant execute on function public.my_soma_whisper_blocks() to anon, authenticated;

create or replace function public.unblock_soma_whisper_sender(p_anchor_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(auth.uid()::text, 777)
    );

    delete from soma_private.whisper_blocks
    where recipient_id = any(public.my_profile_auth_ids())
      and anchor_id = p_anchor_id;

    return found;
end;
$$;
revoke all on function public.unblock_soma_whisper_sender(text) from public;
grant execute on function public.unblock_soma_whisper_sender(text) to anon, authenticated;

create or replace function public.block_soma_whisper_sender(p_whisper_id text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_sender uuid;
    v_ids text[];
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    select w.sender_auth_id
    into v_sender
    from public.soma_whispers w
    where w.id = p_whisper_id
      and public.owns_soma_post(w.post_id);

    if v_sender is null then
        raise exception 'Message unavailable';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(auth.uid()::text, 777)
    );

    -- Записываем блок для каждого auth-ID профиля (и для самого сеанса,
    -- если привязок нет), чтобы блокировка работала при смене сеанса.
    insert into soma_private.whisper_blocks (
        recipient_id, sender_id, anchor_id
    )
    select b.auth_id, v_sender, p_whisper_id
    from (
        select auth_id from soma_private.user_profile_bindings
        where profile_uid = (
            select profile_uid from soma_private.user_profile_bindings
            where auth_id = auth.uid() limit 1
        )
        union
        select auth.uid()
    ) b
    on conflict do nothing;

    with dismissed as (
        update public.soma_whispers w
        set status = 'dismissed'
        where w.sender_auth_id = v_sender
          and public.owns_soma_post(w.post_id)
          and w.status = 'pending'
        returning w.id
    )
    select coalesce(array_agg(id), '{}'::text[])
    into v_ids
    from dismissed;

    return v_ids;
end;
$$;
revoke all on function public.block_soma_whisper_sender(text) from public;
grant execute on function public.block_soma_whisper_sender(text) to anon, authenticated;

-- 9. check_soma_whisper_block — проверка блока по профилю отправителя.
create or replace function public.check_soma_whisper_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_recipient uuid;
    v_sender_ids uuid[];
begin
    select owner_id
    into v_recipient
    from soma_private.post_owners
    where post_id = new.post_id;

    if v_recipient is not null then
        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(v_recipient::text, 777)
        );

        -- Профиль отправителя шёпота: все его auth-ID.
        select coalesce(array_agg(b.auth_id), '{}'::uuid[])
        into v_sender_ids
        from soma_private.user_profile_bindings b
        where b.profile_uid = (
            select b2.profile_uid from soma_private.user_profile_bindings b2
            where b2.auth_id = auth.uid() limit 1
        );

        if exists (
            select 1
            from soma_private.whisper_blocks
            where recipient_id = v_recipient
              and sender_id = any(v_sender_ids)
        ) then
            raise exception 'Whisper unavailable';
        end if;
    end if;

    return new;
end;
$$;

commit;
