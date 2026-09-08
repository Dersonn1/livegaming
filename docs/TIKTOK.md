# TikTok LIVE Integration

## Status: prepared adapter, disabled by default, unofficial

**There is no official, public, ToS-sanctioned API for third-party
developers to receive TikTok LIVE room events** (gifts, likes, follows,
comments, joins) as of this writing. TikTok does not publish a documented
webhook, REST polling endpoint, or WebSocket feed for this equivalent to
what YouTube offers via the YouTube Data API.

## What exists instead

The community-maintained library
[`tiktok-live-connector`](https://www.npmjs.com/package/tiktok-live-connector)
connects to TikTok's **internal** webcast push protocol — the same
undocumented mechanism the official tiktok.com web client uses internally.
This is:

- **Unofficial**: not published or supported by TikTok.
- **Undocumented**: TikTok can change the protocol at any time without
  notice, breaking the library until it's updated.
- **A Terms of Service consideration**: automated access to internal,
  non-public endpoints may be subject to TikTok's ToS. Evaluate this for
  your own use case/jurisdiction before relying on it for anything beyond
  personal testing.

Per this project's instructions ("não implemente scraping frágil como
solução principal"), this mechanism is **not** wired in as the primary,
hard-dependency solution. It exists as a clearly-labeled, opt-in adapter.

## What is implemented

`apps/backend/src/providers/TikTokProvider.ts` is a structurally-complete
`LiveProvider` implementation that:

- Throws a clear, actionable error on `connect()` if `tiktok-live-connector`
  isn't installed — it never silently no-ops or fabricates events.
- Once you install the optional package yourself
  (`npm install tiktok-live-connector --workspace @live/backend`), maps its
  events onto the platform's internal `LiveEvent` model:

  | tiktok-live-connector event | Internal `LiveEventType` |
  |---|---|
  | `gift` | `GIFT` |
  | `member` (join) | `JOIN` |
  | `social` (follow) | `FOLLOW` |
  | `social` (share) | `SHARE` |
  | `like` | `LIKE` |
  | `chat` | `COMMENT` |

## Enabling it

1. `npm install tiktok-live-connector --workspace @live/backend`
2. In the dashboard's **Live** page, select TikTok, enter the streamer's
   username, click Connect. (Or set `TIKTOK_DEFAULT_USERNAME` and call
   `POST /api/live/connect` with `{"provider":"TIKTOK","channel":"<username>"}`.)
3. Monitor the backend logs — if TikTok changes their protocol, this is
   where you'll see connection errors first.

## What's NOT available even with this adapter

Nothing beyond what `tiktok-live-connector` itself exposes — there is no
"donation" event type distinct from gifts (TikTok's monetization model is
gift-based, not a separate Super-Chat-style donation), and no `SUBSCRIPTION`/
`MEMBERSHIP` equivalent is currently mapped (TikTok's LIVE subscription
model differs from YouTube's and is not covered by this adapter).

## If TikTok releases an official API

Because `TikTokProvider` implements the same `LiveProvider` interface as
every other adapter, replacing its internals with an official API (should
one ever ship) requires no changes anywhere else in the pipeline — see
[ARCHITECTURE.md](./ARCHITECTURE.md#extending-to-a-new-live-platform).
