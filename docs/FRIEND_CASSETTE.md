# Friend cassette — standalone link experiment

## Flow

Open `gift.html` from the feed or pager footer. Write ORIGINAL words (13–333
UTF-16 code units), accept the ownership/distribution disclosure, then create a
link. Web Share offers the OS share sheet; clipboard/manual selection is the
fallback. No success message claims confirmed delivery or reading.

The recipient can open without Telegram, Supabase Auth, or registration. A Play
button reveals TEXT, not generated speech. They may save to the existing local
VTR-90 archive or write a blank new reply and manually send that new link back.
The app does not know the sender's address and does not route replies.

Links use the current deployment origin and relative app directory. Links from
preview deployments are preview links, not permanent production links. Test with
a second browser/device, and test actual Telegram/WhatsApp link handling before
calling this a validated growth loop.

## Privacy and authenticity — essential limits

The URL fragment contains base64url-encoded JSON `{v,id,text}`. This is encoding,
NOT encryption. Anyone holding the complete link can decode, read, alter or
forward it. There is no verified sender identity, revocation, expiration, access
count or recipient restriction. Do not describe it as confidential messaging.
These limits are disclosed in the UI; no friend handles are requested.

Fragments are not part of normal HTTP requests to the static host. The dedicated
reader loads no third-party JS/fonts/analytics, has `no-referrer`, and a CSP with
`connect-src 'none'`. No server storage, Supabase request or telemetry collection
is implemented for this flow. Browser history, browser extensions, the selected
messenger, and services handling the complete shared URL can still see it. A
static-host request for the page/assets still occurs and can be logged by the host.

No archive/Whisper content is auto-imported. A reply starts blank, with fresh
consent and a fresh random ID. Content is rendered only using textContent; token
size/schema/version/text are checked on receive. Link/contact filtering is a
limited safety check, not moderation or abuse prevention.

## Archive and rewards

Saving writes only `soma_cassettes` on the same origin in the current browser.
It uses the existing cassette schema and `cas_gift_<random id>` IDs. Reopening the
same link does not duplicate it. Corrupt/full/unwritable storage reports failure
rather than replacing the archive. Capacity is 120 cassettes.

No XP, warmth, Whisper acknowledgement, leaderboard or referral reward is granted.
An external mobile browser and Telegram's WebView may have different storage;
saving in one is NOT a promise of cross-device or cross-context synchronization.
Read receipts and sender notifications are intentionally absent.

## Validation

- `node tests/gift.test.cjs` — 6 tests for round-trip/Unicode, bounds, malformed
  input, random IDs, archive compatibility/dedup/capacity, and privacy scaffolding.
- Existing room regression suite remains green.
- jsdom smoke (installed only outside the repository) exercised consent, creation,
  manual-copy fallback, share cancellation, editing invalidation, recipient Play,
  save/dedup, empty reply, literal HTML rendering and invalid links.
- DOM checks are not visual browser tests. Mobile layout, clipboard/Web Share,
  Telegram navigation and real sharing remain manual release checks.

No SQL, credentials or new runtime dependencies are needed.
