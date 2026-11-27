-- =====================================================================
-- SOMA~LINK // FIX: оповещения о шёпоте/ack приходят сразу (Realtime)
-- -------------------------------------------------------------------------
-- Проблема: все оповещения (входящие шёпоты, ответы, ack-события)
-- доставлялись через периодический poll syncPagerWhispers (8 сек активная
-- игра / 30 сек энергосбережение) — ack-событие ждал следующий тик poll,
-- отсюда задержка и «батчи» накопленных событий.
--
-- Решение: Supabase Realtime. Подписки на INSERT-события:
--   - soma_whispers      — шёпот на наш пост (входящее «игроку прошептали»);
--   - soma_whisper_acks  — recipient сохранил шёпот на кассету (ack-событие).
-- События приходят сразу — без ожидания тика poll. Poll остаётся fallback
-- для событий, пропущенных при переподключении/перезагруке.
--
-- Серверная часть:
--   1. таблицы добавлены в публикацию supabase_realtime;
--   2. RLS на soma_whisper_acks — realtime отдаёт ack-события только
--      отправителю шёпота (sender_auth_id = любой auth-ID профиля);
--   3. триггер record_soma_whisper_ack — SECURITY DEFINER, чтобы запись
--      ack не зависела от RLS-прав DML-роли (иначе exception
--      insufficient_privilege пропускал ack при прямом UPDATE).
--
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- Идемпотентно. Клиентская часть — room.js: setupWhisperRealtime().
-- =====================================================================

begin;

-- 1) Публикация realtime: таблицы шёпотов и ack-событий.
alter publication supabase_realtime add table public.soma_whispers, public.soma_whisper_acks;

-- 2) RLS на soma_whisper_acks: realtime отдаёт ack-события только отправителю
--    шёпота (все auth-ID профиля — как в my_soma_whisper_acks RPC).
alter table public.soma_whisper_acks enable row level security;

drop policy if exists soma_whisper_acks_sender_select on public.soma_whisper_acks;
create policy soma_whisper_acks_sender_select on public.soma_whisper_acks
    for select to authenticated
    using (sender_auth_id = any(public.my_profile_auth_ids()));

-- 3) Триггер ack — SECURITY DEFINER: запись ack не зависит от RLS-прав
--    DML-роли (триггер вставляет строку чужого sender_auth_id).
create or replace function public.record_soma_whisper_ack()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    -- Записывается ack-событие при переходе в статус saved — независимо от
    -- того, останется ли статус saved (recipient может ответить и перевести
    -- шёпот в answered — ack-событие не исчезает, и отправитель всё равно
    -- получает сообщение). unique(whisper_id, sender_auth_id) делает это
    -- идемпотентно.
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

commit;
