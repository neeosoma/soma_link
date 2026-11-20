# First signal and open Whisper admission

## What changes

- Feed entry card invites a visitor to the pager without claiming a stranger has
  specifically contacted them. No auto-open, fabricated sender or simulated reply.
- Before sending: explicit short rules and an equal right to leave.
- With live Whisper enabled and accepted rules, sending is open regardless of
  warmth or lessons, including after reload. Training is optional.
- The first flow shows one real candidate at a time. Read/skip are non-punitive,
  unscored actions. Both move to another candidate for the current page session.
- Demo and own posts are excluded. Empty/error feeds no longer inject a fake post.
- Database errors and missing network never grant send XP or consume quota. A local in-flight guard prevents overlapping sends in the same page.
- Existing server Auth/RLS, unique post/sender and three-per-UTC-day limits remain.
- Incoming messages remain readable/saveable at zero warmth; no reply is promised.

## Boundaries / deployment

No new SQL, dependencies or production config changes are required. This is an
onboarding change, not an Auth migration, cross-device entitlement service, or a
server-authoritative reward system. Rules acceptance uses browser storage; clearing storage or another device
requires accepting again. Do not claim this is abuse-proof or enforced account-wide.
The existing server cap still applies per Auth identity.

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
