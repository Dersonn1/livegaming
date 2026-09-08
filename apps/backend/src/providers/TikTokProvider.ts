import { LiveEvent } from "@live/shared";
import { LiveProvider, LiveProviderState } from "./LiveProvider";
import { normalizeEvent } from "../events/normalizer";
import { logger } from "../logging/logger";

/**
 * TikTok LIVE integration — READ THIS BEFORE ENABLING.
 *
 * TikTok does not publish an official public API for third-party developers
 * to receive LIVE room events (gifts, likes, follows, comments). There is no
 * documented, ToS-sanctioned webhook or REST/WebSocket feed equivalent to
 * YouTube's liveChatMessages API.
 *
 * The only widely-used mechanism is connecting to TikTok's internal webcast
 * push protocol the same way the official web client does (as implemented by
 * the open-source community library "tiktok-live-connector"). This is
 * UNOFFICIAL, undocumented, can break without notice whenever TikTok changes
 * its internal protocol, and its use may be subject to TikTok's Terms of
 * Service — evaluate that risk for your own use case before enabling it.
 *
 * Per project instructions this is NOT wired in as a hard dependency and is
 * NOT enabled by default. This class is a prepared, structurally-correct
 * adapter: install `tiktok-live-connector` yourself
 * (npm install tiktok-live-connector --workspace @live/backend) and set
 * TIKTOK_DEFAULT_USERNAME to enable it. Until installed, connect() throws a
 * clear, actionable error instead of silently no-op'ing or faking events.
 *
 * Event coverage once enabled, mapped onto the internal LiveEvent model:
 *   member  -> JOIN        gift    -> GIFT         chat  -> COMMENT
 *   social (follow) -> FOLLOW      like -> LIKE     share -> SHARE
 */
export class TikTokProvider implements LiveProvider {
  readonly name = "TIKTOK";
  private state: LiveProviderState = {
    status: "DISCONNECTED",
    channel: null,
    lastEventAt: null,
    error: null,
  };
  private handlers: Array<(event: LiveEvent) => void> = [];
  private connection: any = null;

  onEvent(handler: (event: LiveEvent) => void): void {
    this.handlers.push(handler);
  }

  getState(): LiveProviderState {
    return this.state;
  }

  async connect(username: string): Promise<void> {
    this.state = { status: "CONNECTING", channel: username, lastEventAt: null, error: null };

    let TikTokLiveConnection: any;
    try {
      // Optional peer dependency — intentionally not in package.json (see class docs).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ({ WebcastPushConnection: TikTokLiveConnection } = require("tiktok-live-connector"));
    } catch {
      const error =
        "tiktok-live-connector is not installed. Run: npm install tiktok-live-connector --workspace @live/backend. " +
        "See docs/TIKTOK.md for the full setup and its unofficial-API caveats.";
      this.state = { status: "ERROR", channel: username, lastEventAt: null, error };
      throw new Error(error);
    }

    this.connection = new TikTokLiveConnection(username);
    this.registerHandlers();

    try {
      await this.connection.connect();
      this.state = { status: "CONNECTED", channel: username, lastEventAt: null, error: null };
    } catch (err) {
      this.state = { status: "ERROR", channel: username, lastEventAt: null, error: (err as Error).message };
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        this.connection.disconnect();
      } catch (err) {
        logger.warn(err, "Error disconnecting TikTok connection");
      }
    }
    this.connection = null;
    this.state = { status: "DISCONNECTED", channel: null, lastEventAt: null, error: null };
  }

  private emit(event: LiveEvent): void {
    this.state.lastEventAt = event.timestamp;
    for (const handler of this.handlers) handler(event);
  }

  private registerHandlers(): void {
    const provider = "TIKTOK" as const;

    this.connection.on("gift", (data: any) => {
      this.emit(
        normalizeEvent({
          provider,
          type: "GIFT",
          userId: String(data.userId),
          username: data.uniqueId ?? data.nickname ?? "unknown",
          amount: data.repeatCount ?? 1,
          metadata: { giftName: data.giftName, diamondCount: data.diamondCount },
        })
      );
    });

    this.connection.on("member", (data: any) => {
      this.emit(
        normalizeEvent({
          provider,
          type: "JOIN",
          userId: String(data.userId),
          username: data.uniqueId ?? data.nickname ?? "unknown",
        })
      );
    });

    this.connection.on("social", (data: any) => {
      if (data.displayType?.includes("follow")) {
        this.emit(
          normalizeEvent({
            provider,
            type: "FOLLOW",
            userId: String(data.userId),
            username: data.uniqueId ?? data.nickname ?? "unknown",
          })
        );
      } else if (data.displayType?.includes("share")) {
        this.emit(
          normalizeEvent({
            provider,
            type: "SHARE",
            userId: String(data.userId),
            username: data.uniqueId ?? data.nickname ?? "unknown",
          })
        );
      }
    });

    this.connection.on("like", (data: any) => {
      this.emit(
        normalizeEvent({
          provider,
          type: "LIKE",
          userId: String(data.userId),
          username: data.uniqueId ?? data.nickname ?? "unknown",
          amount: data.likeCount ?? 1,
        })
      );
    });

    this.connection.on("chat", (data: any) => {
      this.emit(
        normalizeEvent({
          provider,
          type: "COMMENT",
          userId: String(data.userId),
          username: data.uniqueId ?? data.nickname ?? "unknown",
          message: data.comment ?? "",
        })
      );
    });

    this.connection.on("streamEnd", () => {
      this.state = { status: "DISCONNECTED", channel: this.state.channel, lastEventAt: this.state.lastEventAt, error: null };
    });

    this.connection.on("error", (err: any) => {
      logger.error(err, "TikTok connection error");
      this.state = { ...this.state, status: "ERROR", error: String(err) };
    });
  }
}

export const tiktokProvider = new TikTokProvider();
