import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CooldownManager } from "../src/rules/cooldownManager";

describe("CooldownManager", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows the first call and blocks subsequent calls within the window", () => {
    const cd = new CooldownManager();
    expect(cd.check("r1", 10, "IGNORE", 1).allowed).toBe(true);
    expect(cd.check("r1", 10, "IGNORE", 1).allowed).toBe(false);
  });

  it("allows again after the cooldown window elapses", () => {
    const cd = new CooldownManager();
    expect(cd.check("r1", 10, "IGNORE", 1).allowed).toBe(true);
    vi.advanceTimersByTime(11_000);
    expect(cd.check("r1", 10, "IGNORE", 1).allowed).toBe(true);
  });

  it("ACCUMULATE strategy sums amounts during cooldown instead of firing", () => {
    const cd = new CooldownManager();
    expect(cd.check("meteor", 30, "ACCUMULATE", 1)).toEqual({ allowed: true, multiplier: 1 });
    expect(cd.check("meteor", 30, "ACCUMULATE", 1).allowed).toBe(false);
    const result = cd.check("meteor", 30, "ACCUMULATE", 1);
    expect(result.allowed).toBe(false);
    expect(result.multiplier).toBe(2); // two accumulated events while on cooldown
  });

  it("cooldownSeconds = 0 never blocks", () => {
    const cd = new CooldownManager();
    expect(cd.check("r1", 0, "IGNORE", 1).allowed).toBe(true);
    expect(cd.check("r1", 0, "IGNORE", 1).allowed).toBe(true);
  });
});
