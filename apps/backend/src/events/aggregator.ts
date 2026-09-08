import { LiveEvent } from "@live/shared";
import { normalizeEvent } from "./normalizer";

/**
 * Anti-spam aggregation: a burst of LIKE events must not become a burst of
 * commands. LikeAggregator tracks a running per-session total and only ever
 * emits a synthetic LIKE_MILESTONE event when a configured threshold is
 * crossed — regardless of how many raw LIKE events arrived in between.
 */
export class LikeAggregator {
  private totalLikes = 0;
  private lastMilestoneEmitted = 0;
  private readonly stepSize: number;

  constructor(stepSize = 100) {
    this.stepSize = stepSize;
  }

  /** Feed a raw LIKE event; returns a LIKE_MILESTONE event if a threshold was crossed, else null. */
  ingest(event: LiveEvent): LiveEvent | null {
    if (event.type !== "LIKE") return null;
    this.totalLikes += event.amount || 1;

    const currentMilestone = Math.floor(this.totalLikes / this.stepSize) * this.stepSize;
    if (currentMilestone > this.lastMilestoneEmitted && currentMilestone > 0) {
      this.lastMilestoneEmitted = currentMilestone;
      return normalizeEvent({
        provider: event.provider,
        type: "LIKE_MILESTONE",
        userId: event.userId,
        username: event.username,
        amount: currentMilestone,
        metadata: { totalLikes: this.totalLikes },
      });
    }
    return null;
  }

  reset(): void {
    this.totalLikes = 0;
    this.lastMilestoneEmitted = 0;
  }
}

/**
 * Simple sliding-window event/command deduplicator, keyed by an arbitrary
 * dedupe key (e.g. provider+userId+type+message, or a command nonce). Used
 * both for LiveEvent deduplication and for Roblox command idempotency.
 */
export class Deduplicator {
  private seen = new Map<string, number>();
  private readonly windowMs: number;

  constructor(windowMs = 5000) {
    this.windowMs = windowMs;
  }

  /** Returns true if this key was already seen within the window (i.e. it's a duplicate). */
  checkAndRecord(key: string): boolean {
    const now = Date.now();
    this.sweep(now);
    if (this.seen.has(key)) return true;
    this.seen.set(key, now);
    return false;
  }

  private sweep(now: number): void {
    for (const [key, ts] of this.seen) {
      if (now - ts > this.windowMs) this.seen.delete(key);
    }
  }
}
