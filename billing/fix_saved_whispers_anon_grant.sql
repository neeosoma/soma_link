-- ============================================================================
-- FIX: ack-notice и тепло за сохранение шёпота на кассету НЕ приходили
-- (ни входящее сообщение, ни +Тепло) после внедрения PR #147/#148.
--
-- Причина: RPC my_saved_soma_whispers() (чтение шёпотов, которые сохранены
-- другими людьми на кассету — именно этот RPC вызывает syncPagerWhispers
-- для выдачи ack-notice и начисления тепла) был создан в базовой миграции
-- billing/setup_stars.sql с правом execute ТОЛЬКО для authenticated,
-- в то время как приложение использует АНОНИМНЫЙ вход (роль anon):
--
--     grant execute on function public.my_saved_soma_whispers() to authenticated;
--
-- Каждая попытка RPC со стороны клиента-anon падал с
-- «permission denied for function my_saved_soma_whispers», и ошибка
-- молча поглощалась try/catch в syncPagerWhispers — поэтому ни
-- сообщение об отклике кассеты, ни тепло никогда не срабатывали.
-- Все остальные RPC шёпота (send_soma_whisper, set_soma_whisper_status,
-- get_my_pending_whispers, get_my_whisper_replies) уже granted
-- anon, authenticated — спасение и входящие работали, только обратный
-- путь (чтение сохранённых шёпотов отправителя) был недоступен.
--
-- ФIX: добавляем право execute для anon (и оставляем для authenticated).
-- Файл идемпотентно — можно запускать в Supabase → SQL Editor → Run
-- (как owner). Повторный запуск ничего не ломает.
-- ============================================================================

begin;

-- Garantия наличия функции (в случае свежей базы — base-миграция setup_stars.sql)
create or replace function public.my_saved_soma_whispers()
returns table(id text, status text) language sql stable security definer set search_path = '' as $$
    select w.id, w.status from public.soma_whispers w
    where w.sender_auth_id = auth.uid() and w.status = 'saved'
    order by w.created_at desc;
$$;

revoke all on function public.my_saved_soma_whispers() from public;
grant execute on function public.my_saved_soma_whispers() to anon, authenticated;

-- Проверка прав (для ручной верификации в SQL Editor):
--   select p.proname, n.nspname, r.rolname as granted_to
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   cross join lateral aclexplode(p.proacl) r
--   where p.proname = 'my_saved_soma_whispers'
--   order by r.rolname;
-- Должны быть строки для anon и authenticated.

commit;
