-- ======================================================================
-- SOMA~LINK // FIX: восстановить RLS-политики для public.soma_posts
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- Идемпотентно: повторный запуск ничего не ломает.
--
-- Проблема: при попытке отправить сигнал (insert в soma_posts)
-- сервер отвечает 42501:
--   "New row violates row-level security policy for table "soma_posts""
-- Причина: в базе включён Row Level Security, но политика вставки
-- (soma_posts_insert) отсутствует или её CHECK-условие повреждено
-- (кириллический regex теряет кодировку при вставке в SQL Editor).
--
-- Этот файл АБСОЛЮТНО ASCII — ни одной кириллической буквы в CHECK.
-- Все кириллические литералы конструируются через
-- convert_from(decode('...hex...', 'hex'), 'UTF8'), поэтому кодировку
-- НЕВОЗМОЖНО испортить при вставке в Supabase.
-- ======================================================================

begin;

-- Политика чтения (если пропала — пейджер и лента не видят посты)
drop policy if exists "soma_posts_select" on public.soma_posts;
create policy "soma_posts_select" on public.soma_posts
    for select to anon, authenticated using (true);

-- Политика вставки — причина ошибки 42501
-- CHECK: текст 13..666 симв., likes = 0, автор в форме «Аноним #1234»
-- Кириллицу в regex строим через hex, чтобы не зависеть от кодировки.
--   'Аноним'        = D090D0BDD0BED0BDD0B8D0BC
--   'Аноним #'      = D090D0BDD0BED0BDD0B8D0BC2023
--   '^Аноним( #[0-9]{4})?$'  эквивалент:
--   author = 'Аноним'
--   или author ~ '^' || 'Аноним #' || '[0-9]{4}$'
drop policy if exists "soma_posts_insert" on public.soma_posts;
create policy "soma_posts_insert" on public.soma_posts
    for insert to anon, authenticated
    with check (
        char_length(text) between 13 and 666
        and likes = 0
        and (
            author = convert_from(decode('D090D0BDD0BED0BDD0B8D0BC', 'hex'), 'UTF8')
            or
            author ~ ('^' || convert_from(decode('D090D0BDD0BED0BDD0B8D0BC2023', 'hex'), 'UTF8') || '[0-9]{4}$')
        )
    );

-- Политика лайков (если тоже пропала)
drop policy if exists "soma_posts_update_likes" on public.soma_posts;
create policy "soma_posts_update_likes" on public.soma_posts
    for update to anon, authenticated using (true) with check (true);

-- ACL-права для PostgREST (на случай если их тоже не было)
grant select on public.soma_posts to anon, authenticated;
grant insert on public.soma_posts to anon, authenticated;
grant update (likes) on public.soma_posts to anon, authenticated;

-- Защита от подмены: при необходимости уточнить CHECK по таблице
-- (см. billing/setup_stars.sql). Триггер guard_soma_posts() уже
-- запрещает менять текст/тег/автора чужого поста.

commit;
