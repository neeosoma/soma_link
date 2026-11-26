-- =====================================================================
-- SOMA~LINK // FIX: входящее «Шёпот сохранён на кассету» не приходило
-- в браузере/десктопе (опять).
-- -------------------------------------------------------------------------
-- Симптом: отправитель «Шёпота» не получал входящее сообщение, что его шёпот
-- сохранили на кассету (ack-событие), хотя recipient нажал «Записать на
-- кассету» и сервер зафиксировал ack (soma_whisper_acks).
--
-- Причина: my_soma_whisper_acks() фильтровала строго
--     a.sender_auth_id = auth.uid()
-- Профиль может быть привязан к НЕСКОЛЬКИМ auth-ID (старый сеанс, новый
-- сеанс после пересоздания анонимной сессии/очистки кэша, другой device).
-- Шёпот отправлен старым сеансом (sender_auth_id = старый), а приложение
-- сейчас работает с новым сеансом — auth.uid() = новый, строгая фильтрация
-- не возвращает ack за старый сеанс → уведомление не доставляется.
--
-- Fix: фильтр по профилю — my_profile_auth_ids() возвращает ВСЕ auth-ID,
-- привязанные к текущему профилю. Тогда ack за шёпот, отправленный любым
-- сеансом профиля, доставляется текущем сеансу. my_profile_auth_ids() уже
-- применён в базе (helper из pager-фикса). Идемпотентно.
--
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- =====================================================================

begin;

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

commit;
