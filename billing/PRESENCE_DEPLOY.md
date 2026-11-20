# Quiet presence rollout

The current feed uses a real, anonymous, nonverbal **«Я рядом»** mark. It is a
separate action from the optional personal **«Шёпот»**. Reading silently and
passing remain available without accepting reply rules. The mark sends no text,
opens no conversation, and does not promise help, a reply, or continued contact.
There is no push notification: an author sees the quiet note in their own feed
when it refreshes or is opened.

## Database prerequisites and order

The existing base schema must already provide `public.soma_posts`, Auth-backed
post ownership (`soma_private.post_owners`), and Anonymous Auth sign-in. On
startup, the client binds its opaque profile key to its Auth identity through a
restricted RPC; that mapping, ownership and marks stay in the private schema.
The client-side post text remains public.

Roll out the updated frontend **before** these privilege changes. The current
client selects only its required profile/story columns and degrades gracefully
while the new RPCs are absent; older clients use `select('*')` for profiles and
will fail after the legacy counter columns are hidden.

1. Publish the updated frontend.
2. Apply [`setup_witness_marks.sql`](./setup_witness_marks.sql) in Supabase SQL
   Editor as the project owner.
3. Apply [`setup_station_presence.sql`](./setup_station_presence.sql). It adds a
   boolean-only atmosphere RPC; it returns no count, post ID, or reader data.
4. Confirm Anonymous Auth is enabled. Reading, filtering, and skipping do not
   require it; the server-backed mark does.

Both migrations are transactional and safe to rerun. Do not rerun the full base
schema just for this feature. The old [`setup_station_ritual.sql`](./setup_station_ritual.sql)
counts Whispered-to stories against a `12` goal and is **not used by the current
UI**; do not apply it for the quiet-presence rollout. If it was applied earlier,
it can remain installed and idle.

## Privacy and behavior

- A reader can mark a verified story once; repeated requests are idempotent.
  A private per-reader daily cap limits abuse, but the UI does not display a
  quota or turn it into a goal.
- The author learns only whether at least one mark exists on their own post;
  no names, identities, exact mark totals, timestamps, or sender records are
  returned. Each new mark awards exactly **+2 warmth** to the author (no XP).
  The server records this in a private reward ledger and syncs it to the author's
  profile, including when the author was offline when the mark arrived.
- Other readers learn only whether they personally marked the story. They do
  not see a public counter or whether anyone else did.
- The atmosphere RPC returns one boolean only after an internal privacy floor;
  it never returns a score, target story, or progress toward a goal.
- Posts without a verified Auth owner (for example, older legacy posts) cannot
  receive this mark. Silent reading and skipping remain available; the UI does
  not offer a broken sign or Whisper action for an unowned post. Verified posts
  keep the optional Whisper action separate from the mark.
- No XP, weekly XP, likes, or per-story public totals are awarded or written by
  the feed's mark action. The migration also revokes client SELECT access to
  legacy `soma_posts.likes` and `soma_users.seen/reacts`, and disables the old
  likes update policy; only the story and profile columns used by the current
  client remain readable.

## Local verification

With `@electric-sql/pglite` installed outside the repository:

```sh
NODE_PATH=/tmp/soma-validation/node_modules node tests/presence.integration.cjs
node --test tests/witness.test.cjs tests/station-ritual.test.cjs
```

The local integration test checks PostgreSQL permissions and behavior with a
stubbed `auth.uid()`. It does not test Supabase JWT/PostgREST transport,
production data, live multi-account delivery, or visual behavior. This code
change does **not** apply the SQL to production or deploy the site.
