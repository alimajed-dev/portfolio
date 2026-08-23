# Conversation Opportunity Radar — X API compliance runbook

Last policy review: 2026-08-19

This is an engineering compliance checklist, not legal advice. X can change its
terms. Review the current sources before every material change to the Radar:

- [Developer Agreement](https://docs.x.com/developer-terms/agreement)
- [Developer Policy](https://docs.x.com/developer-terms/policy)
- [Restricted uses](https://docs.x.com/developer-terms/restricted-use-cases)
- [Post display requirements](https://docs.x.com/developer-terms/display-requirements)
- [X brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit)

## Registered use case

The existing application is registered for the Conversation Opportunity Radar:
a public portfolio feature that searches a bounded set of recent public original
posts, locally scores them for professional conversation fit and public reply
activity, caches only the latest qualifying results for no more than 24 hours,
and displays at most six posts with X attribution. Only the owner can trigger a
manual scan or decide whether to engage. The application performs no write
actions, external AI processing, model training, sensitive inference,
advertising, surveillance, or off-X identity matching. Reassess the registered
use case before any material change to those analyses, displays, or actions.

## Enforced product boundaries

- Official X API only. No scraping, browser automation, or non-API collection.
- Public original posts only. Replies, reposts, quote posts, protected content,
  paid nullcasts, and malformed records are rejected.
- No posting, replying, liking, reposting, following, messaging, or other
  automated engagement.
- No X Content is sent to Gemini or any other external AI provider.
- No X Content or owner feedback is used to train or fine-tune any model.
- No sensitive attributes, location, or non-public information are derived.
- No off-X identity matching, advertising targeting, surveillance, sale,
  licensing, dataset export, or third-party redistribution.
- Credentials are server-only. Safe monitoring excludes all post text, post and
  author identifiers, credentials, owner tokens, and visitor data.

## Display checklist

Each displayed post must include its full unmodified text, linked entities,
author profile image, linked display name, linked @username, linked timestamp,
official X mark, public metrics, and a titled X permalink. Do not truncate or
spell-correct the post. A user-initiated Suggest reply control may copy a local
writing brief, but it must not send X Content to an AI provider or post or
automate actions on X.

## Retention and removals

- The content cache contains only the latest six qualifying posts. A separate
  content-free timestamp preserves the 10-day scan cadence after content expiry.
- `X_CONTENT_MAX_AGE_HOURS` is hard-capped at 24; the default is 12.
- Automatic scans remain on the owner-selected 240-hour cadence. The public
  result set intentionally expires between scans rather than retaining stale X
  Content; an authorized manual scan can repopulate it sooner.
- A successful scan replaces the previous snapshot. An independent expiry timer
  removes the snapshot at the retention boundary; expired, legacy, or
  incompatible snapshots are also deleted on read rather than displayed.
- Removal requests go to the address on `/privacy` and must be handled within
  24 hours. Use the protected `POST /api/conversation-radar/remove` endpoint
  with `{ "postId": "..." }`; it purges the post and stores only a one-way hash
  to prevent reappearance.
- If API access terminates, stop the service and call `purgeAllRadarContent()`
  from `lib/x-radar/cache.ts` (or delete the Radar snapshot, removals, and legacy
  seen files from the configured data directory) within the required period.

## Change control

Any new retrieval lane, authenticated-user endpoint, thread reconstruction,
owner-feedback personalization, AI/ML processing, public audience, commercial
use, or write action requires a fresh X-policy review and—when the approved use
case changes—X approval before implementation is enabled in production.
