-- Anonymous, nonverbal presence marks for public stories.
-- Requires Auth-backed post ownership from billing/setup_stars.sql.
begin;

-- The feed no longer exposes or updates legacy engagement counters. Keep the
-- old columns for compatibility, but make only the story/profile fields used by
-- the current client readable through PostgREST.
revoke select on table public.soma_posts from public, anon, authenticated;
revoke select (likes) on table public.soma_posts from public, anon, authenticated;
grant select (id, author, tag, text, created_at)
    on table public.soma_posts to anon, authenticated;
revoke update on table public.soma_posts from public, anon, authenticated;
revoke update (likes) on table public.soma_posts from public, anon, authenticated;
drop policy if exists "soma_posts_update_likes" on public.soma_posts;

revoke select on table public.soma_users from public, anon, authenticated;
revoke select (seen, reacts) on table public.soma_users from public, anon, authenticated;
grant select (username, xp, warmth, help_attempts, whispers_sent,
              weekly_xp, weekly_key, cosmetics, owned_cosmetics)
    on table public.soma_users to anon, authenticated;

-- Keep the legacy counters from being re-populated by stale clients. The
-- current app writes only these profile columns; service-role routines remain
-- unaffected by the client grants below.
revoke insert on table public.soma_users from public, anon, authenticated;
revoke update on table public.soma_users from public, anon, authenticated;
revoke insert (seen, reacts) on table public.soma_users from public, anon, authenticated;
revoke update (seen, reacts) on table public.soma_users from public, anon, authenticated;
grant insert (username, xp, help_attempts)
    on table public.soma_users to anon, authenticated;
grant update (xp, warmth, help_attempts, weekly_xp, weekly_key, cosmetics, owned_cosmetics)
    on table public.soma_users to anon, authenticated;

create schema if not exists soma_private;
revoke all on schema soma_private from public, anon, authenticated;

create table if not exists soma_private.post_witness_marks (
    post_id text not null references public.soma_posts(id) on delete cascade,
    reader_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (post_id, reader_id)
);

-- Link the anonymous app profile to the unforgeable Auth owner only inside the
-- private schema. This lets a server-side mark reward the author, even offline.
alter table soma_private.post_owners
    add column if not exists profile_uid text;

create table if not exists soma_private.user_profile_bindings (
    auth_id uuid primary key,
    profile_uid text not null check (profile_uid ~ '^u_[0-9a-f]{4,32}$')
);

create table if not exists soma_private.witness_author_warmth (
    author_id uuid primary key,
    total_warmth integer not null default 0 check (total_warmth >= 0),
    synced_warmth integer not null default 0 check (synced_warmth >= 0 and synced_warmth <= total_warmth)
);

create index if not exists soma_post_witness_reader_created_idx
    on soma_private.post_witness_marks (reader_id, created_at desc);

alter table soma_private.post_witness_marks enable row level security;
alter table soma_private.user_profile_bindings enable row level security;
alter table soma_private.witness_author_warmth enable row level security;
revoke all on soma_private.post_witness_marks from public, anon, authenticated;
revoke all on soma_private.user_profile_bindings from public, anon, authenticated;
revoke all on soma_private.witness_author_warmth from public, anon, authenticated;

-- Capture the profile key into private ownership metadata; it never becomes a
-- selectable column on soma_posts or a public field in the witness RPC.
create or replace function public.capture_soma_post_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_profile_uid text;
begin
    if auth.uid() is not null then
        select b.profile_uid into v_profile_uid
          from soma_private.user_profile_bindings b
         where b.auth_id = auth.uid();
        insert into soma_private.post_owners (post_id, owner_id, profile_uid)
        values (new.id, auth.uid(), v_profile_uid);
    end if;
    return new;
end;
$$;
revoke all on function public.capture_soma_post_owner() from public;

-- Called after the app has created/loaded its anonymous profile row. On first
-- use this also backfills existing Auth-owned posts and any offline mark warmth.
create or replace function public.bind_my_soma_profile(p_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_bound text;
    v_pending integer := 0;
    v_updated integer := 0;
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if p_username is null or p_username !~ '^u_[0-9a-f]{4,32}$' then
        raise exception 'Invalid profile';
    end if;
    if not exists (select 1 from public.soma_users u where u.username = p_username) then
        raise exception 'Profile not found';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-witness-owner:' || auth.uid()::text, 1)
    );
    insert into soma_private.user_profile_bindings (auth_id, profile_uid)
    values (auth.uid(), p_username)
    on conflict (auth_id) do nothing;
    select b.profile_uid into v_bound
      from soma_private.user_profile_bindings b where b.auth_id = auth.uid();
    if v_bound is distinct from p_username then raise exception 'Profile binding mismatch'; end if;

    update soma_private.post_owners
       set profile_uid = p_username
     where owner_id = auth.uid() and profile_uid is null;

    select greatest(w.total_warmth - w.synced_warmth, 0)
      into v_pending
      from soma_private.witness_author_warmth w
     where w.author_id = auth.uid();
    if coalesce(v_pending, 0) > 0 then
        update public.soma_users set warmth = warmth + v_pending
         where username = p_username;
        get diagnostics v_updated = row_count;
        if v_updated = 1 then
            update soma_private.witness_author_warmth
               set synced_warmth = total_warmth
             where author_id = auth.uid();
        end if;
    end if;
    return true;
end;
$$;
revoke all on function public.bind_my_soma_profile(text) from public, anon, authenticated;
grant execute on function public.bind_my_soma_profile(text) to authenticated;

-- Returns true only when this Auth identity creates a new mark; false means it
-- already marked the story. The reader identity is never returned to clients.
create or replace function public.mark_soma_post_witness(p_post_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reader uuid := auth.uid();
    v_owner uuid;
    v_profile_uid text;
    v_added integer := 0;
    v_updated integer := 0;
    v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
    if v_reader is null then
        raise exception 'Authentication required';
    end if;

    if p_post_id is null or p_post_id !~ '^[A-Za-z0-9_-]{4,48}$' then
        raise exception 'Invalid post id';
    end if;

    select o.owner_id, o.profile_uid
      into v_owner, v_profile_uid
      from public.soma_posts p
      join soma_private.post_owners o on o.post_id = p.id
     where p.id = p_post_id;

    if not found then
        raise exception 'Post is not available for witness marks';
    end if;
    if v_owner = v_reader then
        raise exception 'Cannot mark own post';
    end if;

    -- Serialize a reader's daily limit check; the unique key separately makes
    -- repeated taps and concurrent duplicate requests idempotent.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-post-witness:' || v_reader::text, 0)
    );

    if exists (
        select 1
          from soma_private.post_witness_marks m
         where m.post_id = p_post_id and m.reader_id = v_reader
    ) then
        return false;
    end if;

    if (
        select count(*)
          from soma_private.post_witness_marks m
         where m.reader_id = v_reader and m.created_at >= v_day_start
    ) >= 30 then
        raise exception 'Daily witness mark limit reached';
    end if;

    -- Serialize rewards for one author as well as the reader-side duplicate/cap check.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('soma-witness-owner:' || v_owner::text, 1)
    );

    insert into soma_private.post_witness_marks (post_id, reader_id)
    values (p_post_id, v_reader)
    on conflict (post_id, reader_id) do nothing;
    get diagnostics v_added = row_count;

    if v_added = 1 then
        -- Queue the reward by Auth owner first so an offline/unbound author's
        -- +2 is not lost; profile binding syncs it on their next app visit.
        insert into soma_private.witness_author_warmth (author_id, total_warmth, synced_warmth)
        values (v_owner, 2, 0)
        on conflict (author_id) do update
           set total_warmth = soma_private.witness_author_warmth.total_warmth + 2;

        if v_profile_uid is not null then
            update public.soma_users
               set warmth = warmth + 2
             where username = v_profile_uid;
            get diagnostics v_updated = row_count;
            if v_updated = 1 then
                update soma_private.witness_author_warmth
                   set synced_warmth = total_warmth
                 where author_id = v_owner;
            end if;
        end if;
    end if;
    return v_added = 1;
end;
$$;

revoke all on function public.mark_soma_post_witness(text) from public, anon, authenticated;
grant execute on function public.mark_soma_post_witness(text) to authenticated;
comment on function public.mark_soma_post_witness(text) is
    'Creates one anonymous presence mark per authenticated reader and verified public story; awards +2 author warmth server-side and returns only whether this call inserted a new mark.';

-- An authenticated viewer can ask about at most 50 public post IDs. Authors
-- learn only whether at least one mark exists for their own post. Other readers
-- learn only whether they personally already marked it. No names, counts, or
-- reader identities leave the private schema.
drop function if exists public.my_soma_post_witness_status(text[]);
create function public.my_soma_post_witness_status(p_post_ids text[])
returns table (
    post_id text,
    is_author boolean,
    can_mark boolean,
    has_witness boolean,
    i_marked boolean,
    author_warmth integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_reader uuid := auth.uid();
begin
    if v_reader is null then
        raise exception 'Authentication required';
    end if;
    if coalesce(pg_catalog.cardinality(p_post_ids), 0) > 50 then
        raise exception 'Too many post IDs';
    end if;

    return query
    select p.id,
           coalesce(o.owner_id = v_reader, false),
           (o.owner_id is not null and o.owner_id <> v_reader)
               and not exists (
                   select 1 from soma_private.post_witness_marks m
                    where m.post_id = p.id and m.reader_id = v_reader
               ),
           coalesce((o.owner_id = v_reader) and exists (
               select 1 from soma_private.post_witness_marks m
                where m.post_id = p.id
           ), false),
           coalesce((o.owner_id <> v_reader) and exists (
               select 1 from soma_private.post_witness_marks m
                where m.post_id = p.id and m.reader_id = v_reader
           ), false),
           case when o.owner_id = v_reader then (
               select u.warmth from public.soma_users u where u.username = o.profile_uid
           ) else null::integer end
      from (
          select distinct requested.id
            from pg_catalog.unnest(coalesce(p_post_ids, array[]::text[])) as requested(id)
           where requested.id ~ '^[A-Za-z0-9_-]{4,48}$'
      ) requested
      join public.soma_posts p on p.id = requested.id
      left join soma_private.post_owners o on o.post_id = p.id
     order by p.id;
end;
$$;

revoke all on function public.my_soma_post_witness_status(text[]) from public, anon, authenticated;
grant execute on function public.my_soma_post_witness_status(text[]) to authenticated;
comment on function public.my_soma_post_witness_status(text[]) is
    'Authors see only a boolean presence state and their own warmth; readers see only their own mark state. No identity or mark count is returned.';

commit;
