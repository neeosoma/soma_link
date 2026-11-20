# Diary journal deployment

Saves the player's cassettes (saved inbound whispers) and their own diary
entries (published signals) in Supabase instead of only `localStorage`, so
records survive a device/browser change when the same authenticated account is
used.

## Deploy (owner, Supabase SQL Editor)

1. Back up the database.
2. Run `billing/setup_journal.sql` (idempotent, transactional). It creates:
   - `public.soma_journal` — the player's own records, RLS by `author_auth_id`.
   - `save_soma_journal_entry`, `get_my_soma_journal`, `set_soma_journal_fav`,
     `delete_soma_journal_entry`, `next_soma_journal_num` (security definer).
3. Ensure **Anonymous Sign-Ins** is enabled (the app signs in anonymously).

## Client flow

- On app start, `window.SOMA_ROOM.hydrateJournalFromCloud()` pulls the
  player's cassettes from `get_my_soma_journal()` and merges them into the
  local cache (cloud is authoritative; local-only rows are kept).
- `saveWhisperCassette` writes the local cache synchronously, then persists to
  the cloud in the background via `save_soma_journal_entry(kind='cassette')`.
- `toggleCassetteFav` / `deleteCassette` update the cache, then the cloud.
- After a successful post publish, `submitPainPost` saves the player's own
  entry via `saveJournalEntry(id, text, date)` (`kind='entry'`).

## Limitations

- Access is tied to the Supabase Auth identity. An anonymous session is a fresh
  UUID per browser; to see records on another device, sign in with a stable
  provider (email/Discord). A new anonymous session will not see prior records.
- Cloud writes are best-effort; the local cache is the immediate source for the
  session and hydrates from the cloud on the next start.
- PGlite integration tests cover PostgreSQL roles/RLS, not live Supabase Auth
  transport. Live two-device verification remains a release gate.
