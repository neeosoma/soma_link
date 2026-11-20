-- ======================================================================
-- SOMA~LINK // DIARY JOURNAL — сохранение кассет (шёпотов) и дневниковых
-- записей игрока в Supabase, а не в localStorage.
--
-- Идемпотентно: повторный запуск ничего не ломает.
-- Все функции — security definer, обходят политики RLS.
-- Применить в Supabase → SQL Editor → New query → Run (как owner).
-- ======================================================================

begin;

-- ----------------------------------------------------------------------
-- 1. Таблица дневника игрока
--    kind: 'cassette' — сохранённый вbound шёпот (кассета)
--         'entry'    — собственная запись игрока (дневник / отправленный сигнал)
--    Только автор видит и редактирует свои записи (RLS по author_auth_id).
-- ----------------------------------------------------------------------
create table if not exists public.soma_journal (
    id text primary key,
    kind text not null default 'cassette' check (kind in ('cassette', 'entry')),
    text text not null check (char_length(text) between 1 and 500),
    date_label text,
    num integer not null default 0,
    fav boolean not null default false,
    created_at timestamptz not null default now(),
    author_auth_id uuid not null default auth.uid()
);

create index if not exists soma_journal_author_idx
    on public.soma_journal (author_auth_id, kind, num desc);
create index if not exists soma_journal_created_idx
    on public.soma_journal (author_auth_id, created_at desc);

alter table public.soma_journal enable row level security;

drop policy if exists "soma_journal_select" on public.soma_journal;
drop policy if exists "soma_journal_insert" on public.soma_journal;
drop policy if exists "soma_journal_update" on public.soma_journal;
drop policy if exists "soma_journal_delete" on public.soma_journal;

create policy "soma_journal_select" on public.soma_journal
    for select to authenticated using (author_auth_id = auth.uid());

create policy "soma_journal_insert" on public.soma_journal
    for insert to authenticated with check (author_auth_id = auth.uid());

create policy "soma_journal_update" on public.soma_journal
    for update to authenticated using (author_auth_id = auth.uid()) with check (author_auth_id = auth.uid());

create policy "soma_journal_delete" on public.soma_journal
    for delete to authenticated using (author_auth_id = auth.uid());

-- Запрет прямого доступа к колонкам вне RPC (защищаем авторство).
revoke all on public.soma_journal from anon, authenticated;
grant select (id, kind, text, date_label, num, fav, created_at) on public.soma_journal to authenticated;
grant insert (id, kind, text, date_label, num, fav, created_at) on public.soma_journal to authenticated;
grant update (fav) on public.soma_journal to authenticated;
grant delete on public.soma_journal to authenticated;

-- ----------------------------------------------------------------------
-- 2. RPC: сохранение записи (upsert по id)
-- ----------------------------------------------------------------------
drop function if exists public.save_soma_journal_entry(text, text, text, text, integer, boolean);
create or replace function public.save_soma_journal_entry(
    p_id text, p_kind text, p_text text, p_date text, p_num integer, p_fav boolean
)
returns public.soma_journal
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    if p_kind not in ('cassette', 'entry') then
        p_kind := 'cassette';
    end if;
    if char_length(p_id) < 1 or char_length(p_id) > 64 then
        raise exception 'invalid_id';
    end if;
    if char_length(p_text) < 1 or char_length(p_text) > 500 then
        raise exception 'invalid_text: 1..500 chars';
    end if;

    insert into public.soma_journal (id, kind, text, date_label, num, fav, author_auth_id)
    values (p_id, p_kind, p_text, p_date, coalesce(p_num, 0), coalesce(p_fav, false), auth.uid())
    on conflict (id) do update
        set kind = excluded.kind,
            text = excluded.text,
            date_label = excluded.date_label,
            num = excluded.num,
            fav = excluded.fav
        where public.soma_journal.author_auth_id = auth.uid();

    return select * from public.soma_journal where id = p_id;
end;
$$;

-- ----------------------------------------------------------------------
-- 3. RPC: получить все записи игрока (кассеты + дневник), по порядку num
-- ----------------------------------------------------------------------
drop function if exists public.get_my_soma_journal();
create or replace function public.get_my_soma_journal()
returns setof public.soma_journal
language sql
stable
security definer
set search_path = ''
as $$
    select j.*
      from public.soma_journal j
     where j.author_auth_id = auth.uid()
     order by j.kind asc, j.num desc, j.created_at desc;
$$;

-- ----------------------------------------------------------------------
-- 4. RPC: переключить видимость (fav)
-- ----------------------------------------------------------------------
drop function if exists public.set_soma_journal_fav(text, boolean);
create or replace function public.set_soma_journal_fav(p_id text, p_fav boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    update public.soma_journal
       set fav = coalesce(p_fav, false)
      where id = p_id and author_auth_id = auth.uid();
    return found;
end;
$$;

-- ----------------------------------------------------------------------
-- 5. RPC: удалить запись (по id, только свои)
-- ----------------------------------------------------------------------
drop function if exists public.delete_soma_journal_entry(text);
create or replace function public.delete_soma_journal_entry(p_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    delete from public.soma_journal
      where id = p_id and author_auth_id = auth.uid();
    return found;
end;
$$;

-- ----------------------------------------------------------------------
-- 6. RPC: пересчитать номер кассеты (num) по порядку для кассет игрока.
--    Возвращает максимальный num среди кассет + 1 (для нового entry).
-- ----------------------------------------------------------------------
drop function if exists public.next_soma_journal_num();
create or replace function public.next_soma_journal_num()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(max(num), 0) + 1
      from public.soma_journal
     where author_auth_id = auth.uid() and kind = 'cassette';
$$;

revoke all on function public.save_soma_journal_entry(text, text, text, text, integer, boolean) from public;
revoke all on function public.get_my_soma_journal() from public;
revoke all on function public.set_soma_journal_fav(text, boolean) from public;
revoke all on function public.delete_soma_journal_entry(text) from public;
revoke all on function public.next_soma_journal_num() from public;

grant execute on function public.save_soma_journal_entry(text, text, text, text, integer, boolean) to authenticated;
grant execute on function public.get_my_soma_journal() to authenticated;
grant execute on function public.set_soma_journal_fav(text, boolean) to authenticated;
grant execute on function public.delete_soma_journal_entry(text) to authenticated;
grant execute on function public.next_soma_journal_num() to authenticated;

commit;
