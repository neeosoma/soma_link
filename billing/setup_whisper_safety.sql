-- Apply AFTER setup_stars.sql. No client identity or report data is made public.
begin;

create table if not exists soma_private.whisper_reports (
    id bigint generated always as identity primary key,
    reporter_id uuid not null,
    whisper_id text not null references public.soma_whispers(id),
    reason text not null check (reason in ('spam', 'harassment', 'unsafe', 'other')),
    status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
    created_at timestamptz not null default now(),
    unique (reporter_id, whisper_id)
);
create index if not exists whisper_reports_queue_idx
    on soma_private.whisper_reports(status, created_at);
create index if not exists whisper_reports_rate_idx
    on soma_private.whisper_reports(reporter_id, created_at);
alter table soma_private.whisper_reports enable row level security;
revoke all on soma_private.whisper_reports from public, anon, authenticated;

create table if not exists soma_private.whisper_blocks (
    recipient_id uuid not null,
    sender_id uuid not null,
    anchor_id text not null references public.soma_whispers(id),
    created_at timestamptz not null default now(),
    primary key (recipient_id, sender_id)
);
alter table soma_private.whisper_blocks enable row level security;
revoke all on soma_private.whisper_blocks from public, anon, authenticated;

-- Recipient-only reporting, one report per message, five NEW reports per UTC day.
create or replace function public.report_soma_whisper(p_whisper_id text, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    if p_reason is null or p_reason not in ('spam', 'harassment', 'unsafe', 'other') then
        raise exception 'Invalid reason';
    end if;
    if not exists (select 1 from public.soma_whispers w
                   where w.id = p_whisper_id and public.owns_soma_post(w.post_id)) then
        raise exception 'Message unavailable';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 2));
    if exists (select 1 from soma_private.whisper_reports
               where reporter_id = auth.uid() and whisper_id = p_whisper_id) then
        return false;
    end if;
    if (select count(*) from soma_private.whisper_reports where reporter_id = auth.uid()
        and created_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')) >= 5 then
        raise exception 'Report limit reached';
    end if;
    insert into soma_private.whisper_reports(reporter_id, whisper_id, reason)
    values (auth.uid(), p_whisper_id, p_reason);
    return true;
end;
$$;
revoke all on function public.report_soma_whisper(text, text) from public, anon;
grant execute on function public.report_soma_whisper(text, text) to authenticated;

-- Sender is resolved inside the database. No sender UUID is returned to clients.
-- Returns IDs of recipient-owned pending messages dismissed by this block.
create or replace function public.block_soma_whisper_sender(p_whisper_id text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
    v_sender uuid;
    v_ids text[];
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    select w.sender_auth_id into v_sender from public.soma_whispers w
    where w.id = p_whisper_id and public.owns_soma_post(w.post_id);
    if v_sender is null then raise exception 'Message unavailable'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 777));
    insert into soma_private.whisper_blocks(recipient_id, sender_id, anchor_id)
    values (auth.uid(), v_sender, p_whisper_id) on conflict do nothing;
    with dismissed as (
        update public.soma_whispers w set status = 'dismissed'
        where w.sender_auth_id = v_sender and public.owns_soma_post(w.post_id)
          and w.status = 'pending' returning w.id
    ) select coalesce(array_agg(id), '{}'::text[]) into v_ids from dismissed;
    return v_ids;
end;
$$;
revoke all on function public.block_soma_whisper_sender(text) from public, anon;
grant execute on function public.block_soma_whisper_sender(text) to authenticated;

-- This separate trigger survives rerunning the base schema's status guard.
create or replace function public.check_soma_whisper_block()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid;
begin
    select owner_id into v_recipient from soma_private.post_owners where post_id = new.post_id;
    if v_recipient is not null then
        -- Same lock as block/unblock: a concurrent send cannot slip past a block.
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_recipient::text, 777));
        if exists (select 1 from soma_private.whisper_blocks
                   where recipient_id = v_recipient and sender_id = auth.uid()) then
            raise exception 'Whisper unavailable';
        end if;
    end if;
    return new;
end;
$$;
revoke all on function public.check_soma_whisper_block() from public, anon, authenticated;
drop trigger if exists trg_soma_whisper_block on public.soma_whispers;
create trigger trg_soma_whisper_block before insert on public.soma_whispers
for each row execute function public.check_soma_whisper_block();

-- Block management exposes only an already-received message ID and block date.
create or replace function public.my_soma_whisper_blocks()
returns table(anchor_id text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
    select b.anchor_id, b.created_at from soma_private.whisper_blocks b
    where b.recipient_id = auth.uid() order by b.created_at desc;
$$;
revoke all on function public.my_soma_whisper_blocks() from public, anon;
grant execute on function public.my_soma_whisper_blocks() to authenticated;

create or replace function public.unblock_soma_whisper_sender(p_anchor_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Authentication required'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 777));
    delete from soma_private.whisper_blocks
    where recipient_id = auth.uid() and anchor_id = p_anchor_id;
    return found;
end;
$$;
revoke all on function public.unblock_soma_whisper_sender(text) from public, anon;
grant execute on function public.unblock_soma_whisper_sender(text) to authenticated;

commit;
