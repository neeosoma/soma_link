# Legacy shared night ritual rollout

> **Legacy only.** `setup_station_ritual.sql` exposes the old Whisper-based 5+/10+/12+ aggregate and is not used by the current UI. For the accepted quiet-presence atmosphere, use [PRESENCE_DEPLOY.md](./PRESENCE_DEPLOY.md) and its witness-mark migrations. Do not apply this legacy SQL as part of the current rollout. If already installed, it can remain idle; the current UI uses `station_presence_atmosphere_status()` instead.

## Historical behavior (legacy implementation)

## What the additive migration does

Apply `billing/setup_station_ritual.sql` only after the existing `soma_posts`,
`public.soma_whispers`, Auth ownership trigger, and `soma_private.post_owners`
schema are installed. It is rerunnable and adds only one partial index and one
`SECURITY DEFINER` RPC; it creates no table, stores no ritual participation, and
does not edit posts or messages. Do not rerun the full base schema just for this
feature.

`public.station_night_ritual_status()` is executable by `authenticated` only.
It requires `auth.uid()` and returns four fields: a coarse bucket (`0`, `5`, `10`,
`12`), fixed goal `12`, completion flag, and at most one public post ID to open.
It returns no raw count, post text, author, owner ID, sender ID, or Whisper body.

The aggregate counts distinct verified-owner stories with at least one
Auth-backed Whisper in the rolling last 24 hours; stories must be no older than
seven days. A sent Whisper counts even if the recipient later dismisses it. A
reader never receives their own post as the ritual target, and the target has
never had a Whisper. Values below five remain hidden; the client shows `5+`,
`10+`, or `12+` only. At `12+`, every client's station window gains a soft light.
There is no XP, streak, ranking, or reward for responding.

## Rollout / verification

1. Confirm the existing base migration has populated `soma_private.post_owners`
   for new posts and that anonymous Auth sign-in works.
2. Apply `setup_station_ritual.sql` in the Supabase SQL Editor as the project
   owner. The script is transactional and safe to rerun.
3. With separate authenticated app sessions, call the RPC through PostgREST:
   - anonymous requests are denied;
   - authenticated responses contain only the four documented fields;
   - low totals return bucket `0`, five to nine return `5`, ten to eleven return
     `10`, and twelve or more return `12`;
   - each reader's own post is never returned as `candidate_post_id`;
   - the selected ID is a public, recent post with no existing Whisper.
4. On the deployed UI, confirm the shared count remains hidden below five, the
   appropriate coarse bucket appears above five, and the station window glows at
   `12+`. Check mobile/Telegram layout and that an RPC error leaves the feed usable.

Before the RPC is installed/reachable, the client deliberately shows no number
and no shared glow; it never substitutes a local count. No live production RPC,
role, or multi-account verification has been performed by the code change itself.

## Local integration test

With `@electric-sql/pglite` installed outside the repository:

```sh
NODE_PATH=/tmp/soma-validation/node_modules node tests/station-ritual.integration.cjs
```

This checks PostgreSQL permissions and bucket logic with stubbed `auth.uid()`;
it does not test Supabase JWT/PostgREST transport, production data, concurrency,
or visual behavior.
