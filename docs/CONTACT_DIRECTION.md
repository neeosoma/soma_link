# Contact-first station: direction and current increment

## Product hypothesis, not a promise of virality

People may return for a meaningful exchange, shared joy or a familiar ritual,
not an obligation to improve their empathy. Test this with real behavior, not
compliments about the artwork. Do not claim retention or acquisition gains until
measured. Existing local event counters are QA instrumentation, not analytics.

## Shipped in earlier PRs

- First real signal, short rules, one early Whisper without warmth/13 lessons.
- Read/skip/answer; no fabricated strangers or acknowledgements.
- Friend cassette link, registration-free reader, manual reply link.
- Explicit link privacy limits and local-only archive storage.

## This increment

- Main feed is **Живая частота**. It invites ordinary experiences and joy as well
  as difficult stories. Publishing stays one story per day; no new grind loops.
- Author chooses one of four intents: presence, perspective, small victory, just
  sharing. Default is sharing, not presumed consent to advice.
- Intent-specific reply guidance in feed and pager; old posts explicitly have no
  declared intent. No algorithm diagnoses feelings or infers consent from text.
- Feed reply opens the corresponding post in the pager, respecting first-send
  rules, ordinary admission, daily caps and author privacy. The misleading blocked
  Help CTA and generic 'everything will be fine' canned reply were removed.
- Reader can select author-labelled lighter posts, filter by intent/theme, hide a
  story locally and restore all hidden stories. The pager respects light/hidden
  preferences too. A light label is NOT a content classifier or safety guarantee.
- Hidden IDs and light preferences stay in `soma_contact_prefs_v1`, current browser
  only. Hiding is NOT reporting, account blocking, deletion or a moderation action.
- A quiet nightly invitation ('one voice, a few minutes') replaces pressure; no
  invented number of online players, unanswered signals or people helped.
- Top-13 is presented as **Звёзды станции**, a ranking of game XP, not moral
  worth. Automatic rank names become station-themed with identical XP thresholds.
- Profile/share copy no longer labels responses empty or people drama. Removed
  the hardcoded misleading 'real help: 0' panel; replaced by friend-cassette entry.
- Paid optional titles/IDs, prices, purchases, XP values, plants and archive data
  stay unchanged. Legacy lore/easter-egg code remains, but the feed no longer sends
  a visitor through the blocked-help trap.
- Safety panel says the game is not an emergency service; removed hardcoded
  non-emergency hotline numbers that have not been verified for this release.
  It retains explicitly Russia-labelled 112 and country-help directory entry.

## Tag compatibility — no SQL migration

The existing `soma_posts.tag` column stores new tags as `S1:<intent>|<topic>`.
Intent IDs: N = presence, V = perspective, W = victory, S = sharing.
Topic remains optional, sanitized as before and capped at 24 UTF-16 code units.
The entire tag is at most 29 code units, within both post and whisper tag limits
of 32 characters. The same encoded tag can pass through Whisper post previews.

Only this exact versioned prefix is parsed. Existing plain tags remain plain
topics with no author intent. Updated UIs decode labels and escape text. Very old
cached clients may show the raw tag until refreshed; changed JS/CSS URLs are
cache-busted. No rows are rewritten or deleted. User-authored intent is advisory,
not an enforceable promise about content or future responses.

Draft intent/topic are stored locally and cleared/reset after a successful post.
Failure preserves the draft and does not consume the daily post allowance.
Reader boundaries are never silently turned off after publishing.

## Still required — do not call the whole concept complete

1. **Trust and safety:** recipient report/block RPCs and a private manual-review
   queue are now prepared behind a disabled rollout flag (see
   `billing/WHISPER_SAFETY_DEPLOY.md`). Production migration/access testing,
   operational moderator handling, public-post reports and broader abuse controls
   remain required. Current Whisper read privileges deliberately
   hide sender identity; real sender blocking must be implemented server-side,
   not by exposing sender IDs to the recipient. CAPTCHA needs client + Auth setup.
2. **Real collective ritual:** authenticated aggregate of eligible unanswered
   signals, with privacy/rate controls and no public ranking of distress. No global
   counter is shown until that trustworthy server query exists.
3. **Measurable experiment:** minimal aggregated events, retention cohorts,
   invitation conversion and opt-out/data-retention policy. Do not collect message
   contents. Review before adding an analytics service or endpoint.
4. **Operational verification:** mobile/Telegram UI, access tests with a third
   unauthorized Auth session, abuse cases, storage recovery boundaries. A happy
   cross-account send is not proof of security.
5. **Feedback iteration:** observe first sessions, ask why people leave/return,
   and compare meaningful exchange and return behavior, not just XP volume.

## Validation for this increment

- `node --test tests/*.test.cjs`: 46 tests, including intent compatibility,
  legacy tags, light/intent combinations, local hidden preferences and pager use.
- jsdom (outside repository): feed/pager guidance, light/intent filters,
  hide/restore, direct reply to the correct selected post after first-send rules,
  and post publish through the existing insert/reset/quota path.
- JS/inline script syntax and diff checks.
- DOM tests do not validate visual layout, real Telegram navigation, or live DB
  behavior. Those remain manual release checks. No production config/SQL changed.
