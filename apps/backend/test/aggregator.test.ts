import { describe, it, expect } from "vitest";
import { LikeAggregator, Deduplicator } from "../src/events/aggregator";
import { normalizeEvent } from "../src/events/normalizer";

describe("LikeAggregator", () => {
  it("does not emit a milestone before the threshold is reached", () => {
    const agg = new LikeAggregator(100);
    const like = normalizeEvent({ provider: "SIMULATOR", type: "LIKE", userId: "u1", username: "a", amount: 50 });
    expect(agg.ingest(like)).toBeNull();
  });

  it("emits exactly one LIKE_MILESTONE when crossing 100, even from many small likes", () => {
    const agg = new LikeAggregator(100);
    let milestoneCount = 0;
    for (let i = 0; i < 150; i++) {
      const like = normalizeEvent({ provider: "SIMULATOR", type: "LIKE", userId: "u1", username: "a", amount: 1 });
      if (agg.ingest(like)) milestoneCount++;
    }
    // Crossing 100 once produces exactly one milestone event.
    expect(milestoneCount).toBe(1);
  });

  it("does not aggregate non-LIKE events", () => {
    const agg = new LikeAggregator(1);
    const gift = normalizeEvent({ provider: "SIMULATOR", type: "GIFT", userId: "u1", username: "a", amount: 100 });
    expect(agg.ingest(gift)).toBeNull();
  });
});

describe("Deduplicator", () => {
  it("flags the second occurrence of the same key within the window as a duplicate", () => {
    const dedupe = new Deduplicator(5000);
    expect(dedupe.checkAndRecord("k1")).toBe(false);
    expect(dedupe.checkAndRecord("k1")).toBe(true);
  });

  it("treats different keys independently", () => {
    const dedupe = new Deduplicator(5000);
    expect(dedupe.checkAndRecord("k1")).toBe(false);
    expect(dedupe.checkAndRecord("k2")).toBe(false);
  });
});
