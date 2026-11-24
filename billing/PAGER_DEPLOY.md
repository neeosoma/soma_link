# Pager rollout

The Pager needs Anonymous Auth and the base `setup_stars.sql` schema, including
private Auth-backed post ownership. Apply `setup_witness_marks.sql` first, then
`setup_pager.sql` in the Supabase SQL Editor as project owner. The migration is
transactional and repeatable. Deploy the updated frontend after the RPCs exist;
otherwise it reports that signals could not be loaded rather than reverting to
a public feed. This document is a deployment plan: no production SQL is run by
these repository changes.

## v2: pager RPCs return SETOF (fixes disappearing signals)

`next_soma_pager_story` and `my_soma_pager_stories` return
`RETURNS SETOF public.soma_posts` (type taken from the real table) instead of
`RETURNS TABLE(id, author, tag, text, cosmetics, created_at)`. An explicit
`RETURNS TABLE` fails in the real Supabase with
`42804 structure of query does not match function result type` when a column
type (e.g. `created_at`) differs between the declared list and the real schema;
the failing RPC then makes the frontend load an empty feed — signals from other
players disappear from the «Поймать сигнал» window. Taking the type from
`public.soma_posts` removes the mismatch. `setup_pager.sql` uses
`drop function if exists` before `create or replace`, so re-running it as
project owner replaces the broken `RETURNS TABLE` versions with the `SETOF`
ones. The functions select `p.*`, so the frontend still receives
`id`, `author`, `tag`, `text`, `cosmetics`, `created_at` (plus the rest).

`next_soma_pager_story` returns one randomly chosen verified story, excluding
one's own and all stories previously decided by that Auth identity. The current
story persists across reloads and parallel tabs until a decision. Reading or
skipping in the Pager, leaving a quiet mark, or successfully sending a Whisper
records a decision; failed actions do not intentionally advance it. Decisions are
private and idempotent. Legacy stories without verified owners are not offered,
because the system cannot safely exclude the reader's own posts. Authentication
is required, including to read and skip in this mode; losing an anonymous Auth
session loses its decision history unless the session is recovered.

An owner can see their own recent stories separately in «Мои сигналы» and see
their anonymous witness note and warmth. Nothing in these RPCs returns reader
identities. Existing direct access to public stories is unchanged by this
migration: this is a product selection rule, not a confidentiality boundary for
public posts.

Verify locally with:

```sh
NODE_PATH=/tmp/soma-validation/node_modules node tests/pager.integration.cjs
node --test tests/witness.test.cjs tests/room.test.cjs
```
