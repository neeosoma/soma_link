-- ======================================================================
-- SOMA~LINK // FIX: восстановить RLS-политики для public.soma_posts
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- Идемпотентно: повторный запуск ничего не ломает.
--
-- Проблема: при попытке отправить сигнал (insert в soma_posts)
-- сервер отвечает 42501:
--   "New row violates row-level security policy for table "soma_posts""
-- Причина: в базе включён Row Level Security, но политика вставки
-- (soma_posts_insert) отсутствует — миграция setup_stars.sql не была
-- применена полностью (или была потеряна при частичной раздатке).
--
-- Файл явно пересоздаёт политики чтения и вставки, точнее как в
-- billing/setup_stars.sql, так что после применения сигнал снова
-- будет уходить в эфир.
-- ======================================================================

begin;

-- Политика чтения (если пропала — пейджер и лента не видят посты)
drop policy if exists "soma_posts_select" on public.soma_posts;
create policy "soma_posts_select" on public.soma_posts
    for select to anon, authenticated using (true);

-- Политика вставки — причина ошибки 42501
-- CHECK: текст 13..666 симв., likes = 0, автор в форме «Аноним #1234»
drop policy if exists "soma_posts_insert" on public.soma_posts;
create policy "soma_posts_insert" on public.soma_posts
    for insert to anon, authenticated
    with check (
        char_length(text) between 13 and 666
        and likes = 0
        and author ~ '^Аноним( #[0-9]{4})?$'
    );

-- Политика лайков (если тоже пропала)
drop policy if exists "soma_posts_update_likes" on public.soma_posts;
create policy "soma_posts_update_likes" on public.soma_posts
    for update to anon, authenticated using (true) with check (true);

-- Защита от подмены: при необходимости уточнить CHECK по таблице
-- (см. billing/setup_stars.sql). Триггер guard_soma_posts() уже
-- запрещает менять текст/тег/автора чужого поста.

commit;
