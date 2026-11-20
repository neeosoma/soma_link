-- Shared night ritual: expose only coarse counts of distinct public stories
-- that received at least one real, Auth-backed Whisper in the last 24 hours.
-- Requires the existing soma_posts, soma_whispers, and soma_private.post_owners schema.
begin;

create index if not exists soma_whispers_ritual_window_idx
    on public.soma_whispers (created_at desc, post_id)
    where sender_auth_id is not null;

create or replace function public.station_night_ritual_status()
returns table (
    progress_bucket integer,
    goal integer,
    is_complete boolean,
    candidate_post_id text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_answered_stories integer := 0;
    v_bucket integer := 0;
    v_candidate text;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    -- Count distinct, verified-owner stories; never return the raw count, text,
    -- author, sender identity, or any message/post contents.
    select count(distinct w.post_id)::integer
      into v_answered_stories
      from public.soma_whispers w
      join public.soma_posts p on p.id = w.post_id
      join soma_private.post_owners o on o.post_id = p.id
     where w.sender_auth_id is not null
       and w.created_at >= now() - interval '24 hours'
       and w.created_at <= now()
       and p.created_at >= now() - interval '7 days'
       and p.created_at <= now();

    -- Small groups stay hidden. Above that, reveal only broad buckets.
    v_bucket := case
        when v_answered_stories >= 12 then 12
        when v_answered_stories >= 10 then 10
        when v_answered_stories >= 5 then 5
        else 0
    end;

    -- Offer one real, recent, never-answered story to this reader. Its content
    -- is already public in the feed; the RPC returns no owner/sender metadata.
    -- If the shared goal is complete, no further target is needed for this ritual.
    if v_bucket < 12 then
        select p.id
          into v_candidate
          from public.soma_posts p
          join soma_private.post_owners o on o.post_id = p.id
         where o.owner_id <> auth.uid()
           and p.created_at >= now() - interval '7 days'
           and p.created_at <= now()
           and p.id ~ '^[A-Za-z0-9_-]{4,48}$'
           and not exists (
               select 1
                 from public.soma_whispers w
                where w.post_id = p.id
           )
         order by p.created_at asc, p.id asc
         limit 1;
    end if;

    return query select v_bucket, 12, (v_bucket = 12), v_candidate;
end;
$$;

revoke all on function public.station_night_ritual_status() from public, anon, authenticated;
grant execute on function public.station_night_ritual_status() to authenticated;
comment on function public.station_night_ritual_status() is
    'Returns only a coarse 24-hour count bucket and one public unanswered post id for the shared night ritual.';

commit;
