# First signal and open Whisper admission

## What changes

- A compact first-session card opens one real post in preview mode; it never
  claims a stranger sent a personal message. No auto-open or simulated reply.
- Read, reply, skip, and “look around” remain equal choices. Skipping is not
  scored. The intro stays available until a choice, but the pager/feed stay open.
- Reading or replying adds a small room glow stored only in this browser. It gives
  no XP, is not public, and is not a signal that the author saw your visit.
- Reading/skipping does not require rules acceptance. If someone chooses to compose,
  show the short rules first and keep an equal right to leave.
- With live Whisper enabled and accepted rules, sending is open regardless of
  warmth or lessons, including after reload. Training is optional.
- The pager shows one real candidate at a time. Demo and own posts are excluded;
  empty/error feeds never inject a fake post.
- Database errors and missing network never grant send XP or consume quota. A
  local in-flight guard prevents overlapping sends in the same page.
- Existing server Auth/RLS, unique post/sender and three-per-UTC-day limits remain.
- Incoming messages remain readable/saveable at zero warmth; no reply is promised.

## Boundaries / deployment

First-session state and its private room glow use browser storage. Clearing storage
or switching devices restarts the intro; it does not change account eligibility.

The shared night ritual needs the additive migration
`billing/setup_station_ritual.sql` after the existing Auth/ownership schema. Until
that RPC exists or is reachable, the UI shows no number and never invents a
community total. The migration adds no content table: it returns only coarse
24-hour buckets and one public post ID, never message text, owner IDs, or sender
identity. See `billing/STATION_RITUAL_DEPLOY.md` before enabling it.

This increment adds no CAPTCHA or crisis moderation. Reports/blocks and friend
cassette links are documented separately. Existing limitations around legacy
posts without verified owners remain; no unsafe ownership backfill is performed.

Legacy posts without a verified recipient still cannot accept whispers; existing
SQL rejects these. Candidate filtering here cannot certify ownership. No unsafe
backfill is performed and such a rejection must remain retryable, without XP.

This admission change adds no CAPTCHA or crisis moderation. Reports/blocks and
friend cassette links are documented separately.

## Local funnel counters (NOT centralized analytics)

`soma_signal_metrics_v1` contains only whitelisted numerical counters:
`entry_view`, `pager_open`, `rules_accept`, `signal_read`, `signal_skip`,
`compose_open`, `send_success`, `cassette_saved`, `echo_received`, `session_start`,
`return_visit`.

Entry view counts once per page lifecycle. Session/return counters are recorded
on feed render; return means a different local calendar day, not D1 retention.
`soma_signal_last_visit` stores that local date. Rules acceptance uses
`soma_signal_rules_v1`. Read/skip do not consume the first send.

No messages, user/post IDs, Telegram names or third-party requests are collected
by this instrumentation. These counters can support local QA but cannot measure
population retention, unique players, acquisition or conversion. No export or
remote collector is installed. Future aggregated analytics requires a separate
reviewed implementation.

## Validation

- `node tests/room.test.cjs`: progression, validation, first admission and reload,
  network failure, demo filtering, fixed-schema counters, concurrent send guard.
- DOM smoke (jsdom installed outside the repository): feed entry, dismiss rules,
  accept, one candidate, skip, compose, offline error, retry/success, subsequent sends remain open, inbox at zero warmth.
- Visual layout on real Telegram/iOS/Android and live cross-account verification
  remain manual checks. DOM smoke does not replace browser/layout testing.

## Manual check

1. New browser profile: entry visible; open pager; close rules without accepting.
2. Reopen, accept rules; read/skip; no XP or quota should change.
3. Send to a NEW post belonging to another Auth session; use 13–333 characters.
4. With network disabled verify no XP or success and retry remains possible.
5. After success, without warmth/lessons, second and third sends stay open after reload; fourth is capped.
6. Recipient at zero warmth receives/saves; sender can later see cassette echo.
7. Existing sender accepts rules once if needed and sends normally, respecting daily/duplicate caps.
8. Empty/failing feed contains no demo story or fake notification.
