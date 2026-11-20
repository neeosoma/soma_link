# Whisper deployment checklist

For a fresh installation, keep `WHISPER_LIVE: false` until database migration
and participant-access tests pass. Production is already enabled by owner request;
do not rerun the base migration just to update the UI.

1. Back up the database. Review and run `billing/setup_stars.sql` in Supabase SQL
   Editor. It runs transactionally and is intended to be rerunnable.
2. Enable **Authentication → Providers → Anonymous Sign-Ins**. Configure abuse
   controls / CAPTCHA for anonymous sign-ups before a public rollout.
3. In two separate browser profiles (A and B), start the app and publish a **new**
   post from each. Each post is automatically bound to its Auth session in a
   private schema. Telegram names and browser post-ID lists are not ownership proof.
4. On a staging deployment, enable `WHISPER_LIVE`. Check sending A → B, the inbox
   at zero warmth, save/dismiss, archive playback, and sender echo synchronization.
5. Using a third Auth session, verify it cannot select A/B messages or update
   their statuses. Check anonymous-key-only requests cannot read or write whispers.
   Verify recipient queries cannot select `sender_uid` or `sender_auth_id`.
6. Check duplicate-post and concurrent fourth-send rejection, and that failed
   status writes leave the incoming message available for retry.
7. Check mobile/desktop, fullscreen, Escape/close, keyboard focus, and long text.
   Then enable the flag in production in a separate reviewed change.

## Important limitations

- Old posts have no verified owner; whisper sends to them are deliberately rejected.
  Never backfill ownership from a browser-supplied list. Anonymous session loss
  (clearing storage / changing device) loses access to owned posts. No recovery or
  cross-device Telegram-auth link is implemented here.
- Server limits apply per anonymous Auth identity, UTC day. A new identity can
  bypass per-account limits; CAPTCHA/rate limiting is necessary for abuse control.
- Sending requires short rules only, not warmth or lessons. Rules acceptance and
  XP/echo rewards are client-side, not server-authoritative progression. Existing profile/post policies
  elsewhere in this app are outside this Whisper hardening.
- The owner reports production SQL applied successfully. PGlite integration tests
  exercise PostgreSQL roles/RLS, not live Supabase Auth transport or concurrency.
  Live two-account and third-party access verification remains unconfirmed.
- A browser smoke check was attempted in the workspace but Chromium could not
  launch (`libnspr4.so` missing); visual verification remains a release gate.

## Permanent open admission

Warmth/lesson gates and the temporary test-open flag have been removed. Anyone
can send after acknowledging the short rules; practice remains voluntary.
No new SQL is needed: existing Auth ownership, one-per-post uniqueness, contact
validation and three-per-UTC-day limits remain. Reports and blocking remain enabled;
see `WHISPER_SAFETY_DEPLOY.md` for migration history and verification caveats.
`WHISPER_LIVE: false` stops the UI, not the database/API.
