# Whisper reports and recipient blocks

## Rollout

1. Back up production before changing it. Review **only**
   `billing/setup_whisper_safety.sql`; it requires the existing verified-post
   ownership / Auth Whisper schema. Do not paste the full base setup merely to
   install this increment.
2. Apply this additive migration in Supabase SQL Editor. It uses a transaction,
   enables RLS on both private tables, and is rerunnable.
3. Test with independent Auth sessions A (sender), B (recipient), C (outsider):
   - B can report a Whisper to B's post, A/C cannot report or block it.
   - B blocks A using that received message, without learning A's identity.
   - A's pending messages to B become dismissed; A's messages to C and other
     senders' messages to B stay unchanged. Saved cassettes are not removed.
   - Future A→B sends fail without XP; unblock permits future sends, subject to
     normal admission, uniqueness and daily cap. Old dismissed rows stay dismissed.
   - Anon-key-only requests cannot execute the new RPCs or read private tables.
   - Report duplicates are harmless; five new reports per recipient/UTC day.
4. Only after those checks enable `WHISPER_SAFETY_LIVE: true` in config.js and
   deploy the reviewed change. It is FALSE in this PR. Until enabled, the new
   report/block controls are not shown. Renaming and intent features do not depend
   on this SQL. If migration/RPC/network fails the UI must not claim success.

The flag controls UI rollout, not database privileges, and turning it off does
not undo existing server blocks. No production database has been changed by the
agent for this increment.

## Scope and privacy

RPC arguments are received message IDs/reasons, not sender identities. Sender
Auth UUIDs are resolved only inside SECURITY DEFINER functions with empty search
paths. The two private tables have no client policies and no direct client grants.
List-blocks returns only an already-received anchor message ID and block date.

Block enforcement lives in a separate before-insert trigger and shares a
recipient-keyed transaction lock with block/unblock. The existing sender daily
lock/cap remains in place. Local SQL tests do not prove concurrent production
behavior; run multi-session race tests on staging before a larger rollout.

A block targets an **Auth identity**, not a human across every account/device.
Creating a new anonymous identity can evade it. CAPTCHA/rate limiting and a
trusted identity strategy remain separate requirements. No Telegram ID is added.
Legacy unverified messages are not used to invent ownership or sender identity.

Blocking itself does not submit a report. Reporting itself does not block,
change XP, automatically punish a user or hide the message. Both require
confirmation. This UI currently reports/blocks from pending inbox cards; it does
not add report controls to archived cassettes or implement public-post reports.

## Real operator workflow — no invented moderator service

There is NO staffed moderation service, moderator web app, automatic classifier,
global ban system, escalation or emergency response in this increment. Reports
are a private queue for the owner to review manually. The UI discloses manual
review/no guaranteed response time before submission. Reporting can reveal the
reported text to the station owner; do not claim recipient-only end-to-end privacy.

Review in Supabase SQL Editor as the database owner (not in client JS):

```sql
select r.id, r.reason, r.status, r.created_at, w.text as reported_text
from soma_private.whisper_reports r
join public.soma_whispers w on w.id = r.whisper_id
where r.status = 'open'
order by r.created_at
limit 50;
```

After review, mark the specific real report ID `resolved` or `dismissed` in the
private table using SQL Editor. This records queue handling only, NOT a global
sanction on the sender. Establish who checks this queue and how often before
publicly advertising reporting as a support channel. Never share query results
publicly or send message contents to analytics.

Choose/document a report retention period and deletion procedure; no automatic
retention job has been installed. Reports store a message reference, reason and
reporter Auth identity (for ownership/rate limiting), not a second copy of the
message body. Recipient blocks persist until unblocked. Restrict operator access.

## Validation

- `node --test tests/*.test.cjs`: 46 unit/regression tests.
- DOM smoke via temporary jsdom: report/block confirmation and cancellation,
  selected reason across refresh, no false success on failure, block list/unblock,
  feature-disabled UI, unchanged XP.
- Real PostgreSQL execution in PGlite: base + repeated additive migration + base
  rerun, roles/RLS, cross-recipient isolation, hidden sender columns, private table
  denial, report dedup/rate cap, blocks/unblock, unchanged send cap, saved-message
  preservation and anon denial. Reproduce without adding runtime dependencies:

```sh
npm install --prefix /tmp/soma-sql-check --no-save --package-lock=false @electric-sql/pglite
NODE_PATH=/tmp/soma-sql-check/node_modules node tests/whisper-safety.integration.cjs
```

PGlite uses PostgreSQL but the test stubs auth.uid from a session setting. It does
not test actual Supabase JWT verification, PostgREST, multi-session races or mobile
layout. Those are manual integration/release gates, not silently assumed passed.
