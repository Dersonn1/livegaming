import { LiveEvent } from "@live/shared";
import { LiveProvider, LiveProviderState } from "./LiveProvider";
import { normalizeEvent } from "../events/normalizer";
import { env } from "../config/env";
import { logger } from "../logging/logger";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube LIVE integration, built entirely on the OFFICIAL YouTube Data API
 * v3 (documented at https://developers.google.com/youtube/v3/live/docs).
 *
 * What IS officially available and implemented here:
 *  - videos.list                -> resolve liveChatId for a channel's active broadcast
 *  - liveChatMessages.list      -> polled every `pollIntervalMs` (min ~2s per quota
 *                                  guidance) for chat, Super Chat, Super Stickers and
 *                                  new-membership events.
 *
 * What is NOT available through any official YouTube API, and therefore is
 * NOT implemented (no fake/simulated fallback is silently substituted):
 *  - Real-time "like" counts on a live broadcast.
 *  - Real-time subscribe/follow events.
 *  - Real-time "share" events.
 * These event types simply never fire from this provider. See docs/YOUTUBE.md.
 *
 * Requires YOUTUBE_API_KEY (API-key-level access works as long as the
 * broadcast's live chat is public). Set YOUTUBE_DEFAULT_CHANNEL_ID or pass a
 * channel/video id explicitly to connect().
 */
export class YouTubeProvider implements LiveProvider {
  readonly name = "YOUTUBE";
  private state: LiveProviderState = {
    status: "DISCONNECTED",
    channel: null,
    lastEventAt: null,
    error: null,
  };
  private handlers: Array<(event: LiveEvent) => void> = [];
  private liveChatId: string | null = null;
  private nextPageToken: string | undefined;
  private pollTimer: NodeJS.Timeout | null = null;
  private seenMessageIds = new Set<string>();

  onEvent(handler: (event: LiveEvent) => void): void {
    this.handlers.push(handler);
  }

  getState(): LiveProviderState {
    return this.state;
  }

  async connect(channelIdOrVideoId: string): Promise<void> {
    if (!env.YOUTUBE_API_KEY) {
      this.state = {
        status: "ERROR",
        channel: channelIdOrVideoId,
        lastEventAt: null,
        error: "YOUTUBE_API_KEY is not configured. See docs/YOUTUBE.md.",
      };
      throw new Error(this.state.error!);
    }

    this.state = { status: "CONNECTING", channel: channelIdOrVideoId, lastEventAt: null, error: null };
    try {
      this.liveChatId = await this.resolveLiveChatId(channelIdOrVideoId);
      this.state = { status: "CONNECTED", channel: channelIdOrVideoId, lastEventAt: null, error: null };
      this.schedulePoll(2000);
    } catch (err) {
      this.state = {
        status: "ERROR",
        channel: channelIdOrVideoId,
        lastEventAt: null,
        error: (err as Error).message,
      };
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.liveChatId = null;
    this.state = { status: "DISCONNECTED", channel: null, lastEventAt: null, error: null };
  }

  private async resolveLiveChatId(videoOrChannelId: string): Promise<string> {
    // Accepts a video id directly; for a channel id, callers are expected to
    // resolve the current live video id upstream (search.list costs quota).
    const url = `${YT_API_BASE}/videos?part=liveStreamingDetails&id=${encodeURIComponent(
      videoOrChannelId
    )}&key=${env.YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube videos.list failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as any;
    const liveChatId = data.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!liveChatId) throw new Error("No active live chat found for the given video id.");
    return liveChatId;
  }

  private schedulePoll(delayMs: number): void {
    this.pollTimer = setTimeout(() => this.poll().catch((err) => logger.error(err, "YouTube poll error")), delayMs);
  }

  private async poll(): Promise<void> {
    if (!this.liveChatId) return;
    const params = new URLSearchParams({
      part: "snippet,authorDetails",
      liveChatId: this.liveChatId,
      key: env.YOUTUBE_API_KEY!,
    });
    if (this.nextPageToken) params.set("pageToken", this.nextPageToken);

    const res = await fetch(`${YT_API_BASE}/liveChat/messages?${params.toString()}`);
    if (!res.ok) {
      logger.error({ status: res.status }, "YouTube liveChatMessages.list failed");
      this.schedulePoll(5000);
      return;
    }
    const data = (await res.json()) as any;
    this.nextPageToken = data.nextPageToken;

    for (const item of data.items ?? []) {
      if (this.seenMessageIds.has(item.id)) continue;
      this.seenMessageIds.add(item.id);
      this.handleMessage(item);
    }
    if (this.seenMessageIds.size > 5000) this.seenMessageIds.clear();

    const nextDelay = Math.max(2000, Number(data.pollingIntervalMillis) || 2000);
    this.schedulePoll(nextDelay);
  }

  private handleMessage(item: any): void {
    const snippet = item.snippet;
    const author = item.authorDetails;
    const userId = author?.channelId ?? "unknown";
    const username = author?.displayName ?? "unknown";
    let event: LiveEvent | null = null;

    switch (snippet.type) {
      case "superChatEvent":
        event = normalizeEvent({
          provider: "YOUTUBE",
          type: "DONATION",
          userId,
          username,
          amount: (snippet.superChatDetails?.amountMicros ?? 0) / 1_000_000,
          message: snippet.superChatDetails?.userComment ?? "",
          metadata: { currency: snippet.superChatDetails?.currency },
        });
        break;
      case "superStickerEvent":
        event = normalizeEvent({
          provider: "YOUTUBE",
          type: "DONATION",
          userId,
          username,
          amount: (snippet.superStickerDetails?.amountMicros ?? 0) / 1_000_000,
          metadata: { currency: snippet.superStickerDetails?.currency, sticker: true },
        });
        break;
      case "newSponsorEvent":
        event = normalizeEvent({ provider: "YOUTUBE", type: "MEMBERSHIP", userId, username });
        break;
      case "textMessageEvent":
        event = normalizeEvent({
          provider: "YOUTUBE",
          type: "COMMENT",
          userId,
          username,
          message: snippet.textMessageDetails?.messageText ?? "",
        });
        break;
      default:
        return; // Unhandled message type — not an error, simply ignored.
    }

    if (event) {
      this.state.lastEventAt = event.timestamp;
      for (const handler of this.handlers) handler(event);
    }
  }
}

export const youtubeProvider = new YouTubeProvider();
