-- =====================================================================
-- SOMA~LINK: Whisper ack-events (сообщение об отклике)
-- Создаёт server-side ack-события: recipient сохранил шёпот на кассету.
-- Аck-события ОСТАЁТСЯ независимо от статуса шёпота — даже если recipient
-- ответил (saved→answered), отправитель всё равно получает сообщение об отклике.
-- Тепло зачисляется серверным триггером credit_soma_whisper_saved_ack.
-- =====================================================================

begin;

-- Аck-события: recipient сохранил шёпот на кассету.
-- unique(whisper_id, sender_auth_id) делает вставку идёмпотентной.
create table if not exists public.soma_whisper_acks (
    id bigserial primary key,
    whisper_id text not null,
    sender_auth_id uuid not null,
    day_key text not null,
    created_at timestamptz not null default now(),
    unique (whisper_id, sender_auth_id)
);
grant select, insert, update on public.soma_whisper_acks to authenticated, anon;

-- Прочитаные ack-события (server-side read-tracking).
create table if not exists public.soma_whisper_acks_read (
    ack_id bigint not null references public.soma_whisper_acks(id) on delete cascade,
    reader_auth_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (ack_id, reader_auth_id)
);
grant select, insert on public.soma_whisper_acks_read to authenticated, anon;

-- Триггер: записать ack-событие при переходе шёпота в статус saved.
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
-- Использует auth.uid() (self-contained для setup_stars.sql); в production
-- fix_whisper_profile_sessions.sql переопределяет через my_profile_auth_ids().
create or replace function public.my_soma_whisper_acks()
returns table(id bigint, whisper_id text, day_key text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select a.id, a.whisper_id, a.day_key, a.created_at
    from public.soma_whisper_acks a
    where a.sender_auth_id = auth.uid()
    and not exists (
        select 1 from public.soma_whisper_acks_read r
        where r.ack_id = a.id and r.reader_auth_id = auth.uid()
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
begin
    insert into public.soma_whisper_acks_read (ack_id, reader_auth_id)
    values (p_ack_id, auth.uid())
    on conflict (ack_id, reader_auth_id) do nothing;
    return true;
end;
$$;
revoke all on function public.mark_soma_whisper_ack_read(bigint) from public;
grant execute on function public.mark_soma_whisper_ack_read(bigint) to anon, authenticated;

commit;
