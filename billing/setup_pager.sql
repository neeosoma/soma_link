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

create or replace function public.next_soma_pager_story()
returns table(id text, author text, tag text, text text, photo text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    select c.post_id into v_id from soma_private.pager_current c
     join soma_private.post_owners o on o.post_id = c.post_id
     where c.reader_id = auth.uid() and o.owner_id <> auth.uid()
       and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = c.post_id);
    if v_id is null then
        delete from soma_private.pager_current where reader_id = auth.uid();
        select p.id into v_id from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where o.owner_id <> auth.uid()
           and not exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = p.id)
         order by random() limit 1;
        if v_id is not null then
            insert into soma_private.pager_current(reader_id, post_id) values (auth.uid(), v_id);
        end if;
    end if;
    return query select p.id, p.author, p.tag, p.text, p.photo, p.created_at from public.soma_posts p where p.id = v_id;
end;
$$;
create or replace function public.decide_soma_pager_story(p_post_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('soma-pager:' || auth.uid()::text, 0));
    if exists (select 1 from soma_private.pager_decisions d where d.reader_id = auth.uid() and d.post_id = p_post_id) then
        return false;
    end if;
    if not exists (select 1 from soma_private.pager_current c where c.reader_id = auth.uid() and c.post_id = p_post_id) then
        raise exception 'Story is not current';
    end if;
    insert into soma_private.pager_decisions(reader_id, post_id) values (auth.uid(), p_post_id);
    delete from soma_private.pager_current where reader_id = auth.uid();
    return true;
end;
$$;
-- Owners can still see their own stories and anonymous witness notes separately.
create or replace function public.my_soma_pager_stories()
returns table(id text, author text, tag text, text text, photo text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    return query select p.id, p.author, p.tag, p.text, p.photo, p.created_at from public.soma_posts p
      join soma_private.post_owners o on o.post_id = p.id
     where o.owner_id = auth.uid() order by p.created_at desc limit 30;
end;
$$;
revoke all on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() from public, anon;
grant execute on function public.next_soma_pager_story(), public.decide_soma_pager_story(text), public.my_soma_pager_stories() to authenticated;
commit;
