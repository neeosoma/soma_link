-- =====================================================================
-- SOMA~LINK // FIX: signals (own pager stories) don't arrive in the browser
-- -------------------------------------------------------------------------
-- Корневая причина: pager-RPC идентифицировали пользователя по auth.uid()
-- (uuid сессии), а не по профилю (profile_uid). В Telegram auth.uid() совпадает
-- с владельцем постов (сигналов); в браузере после переноса прогресса это новый
-- анонимный uuid → my_soma_pager_stories() (owner_id = auth.uid()) возвращала
-- 0 ваших сигналов → они не приходили на пейджер.
--
-- Шёпоты уже были профильными (my_profile_auth_ids()); пейджер приведён к
-- той же логике. Собственные посты отдаются по profile_uid — авторитетному
-- ключу (бэкфайлд для всех строк), это корректно даже для постов, у которых
-- owner_id сессии не привязан к профилю.
--
-- Идемпотентно. Применить в Supabase → SQL Editor → New query → Run (как owner).
-- =====================================================================

begin;

-- Профильный helper (если ещё не определён — например, при применении этого
-- фикса без setup_pager.sql). Нужен soma_private.user_profile_bindings.
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

-- 1. Собственные сигналы пейджера — по профилю (profile_uid), а не auth.uid().
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

-- 2. Следующий фид-история — читатель и исключение «своих» постов по профилю.
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

-- 3. Решение по истории — читатель по профилю (совместно с фидом).
drop function if exists public.decide_soma_pager_story(text);
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

-- Права (сигнатуры не изменились, но перепривязываем явно).
revoke all on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() from public, anon;
grant execute on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() to authenticated;

commit;
