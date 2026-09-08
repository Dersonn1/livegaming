# YouTube LIVE Integration

## Status: implemented on the official YouTube Data API v3

Unlike TikTok, YouTube publishes an official, documented API for reading
LIVE chat activity:
[`liveChatMessages.list`](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list),
part of the YouTube Data API v3. `apps/backend/src/providers/YouTubeProvider.ts`
uses exactly this — no scraping, no unofficial protocol.

## Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a project (or pick an existing one) and enable **"YouTube Data
   API v3"** under APIs & Services → Library.
3. Create an **API key** credential.
4. Set `YOUTUBE_API_KEY` in `apps/backend/.env`.
5. Restrict the key (recommended): API restrictions → YouTube Data API v3
   only.

An API key is sufficient as long as the target broadcast's live chat is
public. `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` are reserved for a future
OAuth-based extension (e.g. reading a channel's own private broadcasts) and
are not required for the current implementation.

## How it works

1. `connect(videoId)` calls `videos.list?part=liveStreamingDetails` to
   resolve the broadcast's `activeLiveChatId`.
2. `liveChatMessages.list` is polled on the interval YouTube itself returns
   (`pollingIntervalMillis`, floored at 2000ms to respect quota guidance).
3. Each message's `snippet.type` is mapped to the internal model:

   | YouTube `snippet.type` | Internal `LiveEventType` | Notes |
   |---|---|---|
   | `textMessageEvent` | `COMMENT` | Regular chat message |
   | `superChatEvent` | `DONATION` | `amount` = `amountMicros / 1_000_000` |
   | `superStickerEvent` | `DONATION` | Same, sticker flagged in `metadata` |
   | `newSponsorEvent` | `MEMBERSHIP` | New channel membership |

## What is connected to — a video id, not just a channel

`connect()` currently takes a **video id** (the specific live broadcast),
not a bare channel id, because resolving "the channel's current live video"
requires a `search.list` call that costs significantly more API quota than
`videos.list`. Pass the video id from the stream's URL
(`youtube.com/watch?v=<this part>`) in the dashboard's Live page.

## What is NOT available via any official YouTube API

These simply never fire from `YouTubeProvider` — there is no unofficial
fallback silently substituted for them:

- **Real-time like counts** on a live broadcast — YouTube does not expose
  this via any public API.
- **Real-time subscribe/follow events** — not exposed for live consumption.
- **Real-time share events** — not exposed.

If your rules depend on `FOLLOW`, `LIKE`, or `SHARE` for YouTube
specifically, they simply won't trigger from a real YouTube connection
(they still work from TikTok and from the Simulator). Build rules for
YouTube around `COMMENT`, `DONATION`, and `MEMBERSHIP` instead.

## Quota

`liveChatMessages.list` costs 5 quota units per call (0.5–5 depending on
`part`), continuously for the duration you stay connected. Default free
quota is 10,000 units/day — plan polling frequency and connection duration
accordingly for long streams.
