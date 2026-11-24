-- =====================================================================
-- FIX: Кросс-устройствная синхронизация прогресса (объединённая модель)
-- Progress должен храниться в облаке (soma_users), а не только в localStorage.
-- localStorage остаётся кешем; при загрузке сливаем localStorage + облако (max/union).
-- =====================================================================

-- 1. Добавляем колонки для всего, что раньше было только в localStorage:
--    greenhouse — прогресс Оранжереи/цветка (bloomed, activeSeed, alienSeed, placed, pots)
--    my_posts   — id моих постов (сигналы)
--    ledger     — ведомство тепла/шёпотов (streak, warmDays, whispersSent, ...)
alter table public.soma_users
    add column if not exists greenhouse jsonb not null default '{}'::jsonb,
    add column if not exists my_posts text[] not null default '{}'::text[],
    add column if not exists ledger jsonb not null default '{}'::jsonb;

-- 2. my_soma_account_days: дни считать от earliest из auth.users.created_at
--    и soma_users.created_at (min). Анонимная идентичность auth может быть
--    создана раньше/позже профиля: считать от профиля alone давало 0 дней
--    на новом устройстве, а от auth alone — проворачивало счётчик в обратную
--    сторону (профиль создан раньше auth на некоторых устройствах).
--    Профиль привязан к auth-идентичности через user_profile_bindings.
create or replace function public.my_soma_account_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        greatest(1, floor(extract(epoch from now() - least(au.created_at, su.created_at)) / 86400)::integer),
        0
    )::integer
      from soma_private.user_profile_bindings b
      join public.soma_users su on su.username = b.profile_uid
      join auth.users au on au.id = b.auth_id
     where b.auth_id = auth.uid()
$$;

revoke all on function public.my_soma_account_days() from public, anon, authenticated;
grant execute on function public.my_soma_account_days() to authenticated;

commit;
