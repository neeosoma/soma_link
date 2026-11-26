-- One anonymous story at a time, with durable per-reader decisions.
-- Apply after setup_witness_marks.sql.
begin;
create table if not exists soma_private.pager_decisions (
    reader_id uuid not null,
    post_id text not null references public.soma_posts(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (reader_id, post_id)
);
create table if not exists soma_private.pager_current (
    reader_id uuid primary key,
    post_id text not null references public.soma_posts(id) on delete cascade
);
alter table soma_private.pager_decisions enable row level security;
alter table soma_private.pager_current enable row level security;
revoke all on soma_private.pager_decisions, soma_private.pager_current from public, anon, authenticated;

-- Профильный helper: все auth-ID сессий, привязанных к текущему профилю.
-- Используется pager-RPC вместо auth.uid(), чтобы сигналы (посты) переносились
-- и отображались в браузере после переноса прогресса. Нужен soma_private.user_profile_bindings.
create or replace function public.my_profile_auth_ids()
returns uuid[]
language sql
stable
security definer
set search_path = '' as $$
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

-- v2: RETURNS SETOF public.soma_posts вместо RETURNS TABLE(explicit types) —
-- тип берётся из реальной таблицы, исключает 42804 при расхождении типов колонок
-- (например created_at) между явным RETURNS TABLE и реальной схемой в Supabase.
-- v3: pager идентифицирует пользователя по ПРОФИЛЮ (profile_uid), а не по auth.uid()
-- сессии. В браузере после переноса прогресса auth.uid() — новый анонимный uuid,
-- поэтому по auth.uid() ваши сигналы (посты) не находились. Шёпоты уже были
-- профильными через my_profile_auth_ids(); пейджер приведён к той же логике.
-- Собственные посты — по profile_uid (авторитетный ключ, бэкфайлд для всех строк).
drop function if exists public.next_soma_pager_story();
create or replace function public.next_soma_pager_story()
returns setof public.soma_posts
language plpgsql security definer set search_path = '' as $$
declare v_id text; v_profile text; v_ids uuid[];
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    v_ids := coalesce(public.my_profile_auth_ids(), '{}'::uuid[]);
    if array_length(v_ids, 1) is null then v_ids := array[auth.uid()]; end if;
    select b.profile_uid into v_profile
      from soma_private.user_profile_bindings b
     where b.auth_id = auth.uid()
     limit 1;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    select c.post_id into v_id from soma_private.pager_current c
     join soma_private.post_owners o on o.post_id = c.post_id
     where c.reader_id = any(v_ids)
       and not (o.owner_id = auth.uid() or (v_profile is not null and o.profile_uid = v_profile))
       and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = any(v_ids) and d.post_id = c.post_id);
    if v_id is null then
        delete from soma_private.pager_current where reader_id = any(v_ids);
        select p.id into v_id from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where not (o.owner_id = auth.uid() or (v_profile is not null and o.profile_uid = v_profile))
           and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = any(v_ids) and d.post_id = p.id)
         order by p.created_at asc, p.id asc limit 1;
        if v_id is not null then
            insert into soma_private.pager_current(reader_id, post_id) values (auth.uid(), v_id);
        end if;
    end if;
    return query select p.* from public.soma_posts p where p.id = v_id;
end;
$$;
create or replace function public.decide_soma_pager_story(p_post_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    v_ids := coalesce(public.my_profile_auth_ids(), '{}'::uuid[]);
    if array_length(v_ids, 1) is null then v_ids := array[auth.uid()]; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    if exists (select 1 from soma_private.pager_decisions d where d.reader_id = any(v_ids) and d.post_id = p_post_id) then
        return false;
    end if;
    if not exists (select 1 from soma_private.pager_current c where c.reader_id = any(v_ids) and c.post_id = p_post_id) then
        raise exception 'Story is not current';
    end if;
    insert into soma_private.pager_decisions(reader_id, post_id) values (auth.uid(), p_post_id);
    delete from soma_private.pager_current where reader_id = any(v_ids);
    return true;
end;
$$;
-- Owners can still see their own stories and anonymous witness notes separately.
-- v3: собственные сигналы — по профилю (profile_uid), а не по auth.uid() сессии.
-- v2: RETURNS SETOF public.soma_posts (тип из реальной таблицы) вместо RETURNS TABLE.
drop function if exists public.my_soma_pager_stories();
create or replace function public.my_soma_pager_stories()
returns setof public.soma_posts
language plpgsql stable security definer set search_path = '' as $$
declare v_profile text;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    select b.profile_uid into v_profile
      from soma_private.user_profile_bindings b
     where b.auth_id = auth.uid()
     limit 1;
    if v_profile is null then
        -- Непривязанная сессия — отдаём посты по auth.uid() (старое поведение).
        return query select p.* from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where o.owner_id = auth.uid()
         order by p.created_at desc limit 30;
    else
        return query select p.* from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where o.profile_uid = v_profile
         order by p.created_at desc limit 30;
    end if;
end;
$$;
revoke all on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() from public, anon;
grant execute on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() to authenticated;
commit;
