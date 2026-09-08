import { CooldownStrategy } from "@live/shared";

interface CooldownState {
  lastFiredAt: number;
  accumulated: number;
}

/**
 * Tracks per-rule cooldowns. Strategies:
 *  - IGNORE:     events during cooldown are dropped entirely (default).
 *  - ACCUMULATE: events during cooldown add to `amount`, which the rule's
 *                action receives as a multiplier once cooldown expires.
 *  - ESCALATE:   like ACCUMULATE, but also compounds priority so a busy
 *                cooldown window produces a single, bigger effect.
 */
export class CooldownManager {
  private state = new Map<string, CooldownState>();

  /**
   * Returns { allowed: true, multiplier } if the rule may fire now, or
   * { allowed: false } if it's within cooldown and the event was
   * suppressed/accumulated instead.
   */
  check(ruleId: string, cooldownSeconds: number, strategy: CooldownStrategy, amount: number) {
    if (cooldownSeconds <= 0) return { allowed: true, multiplier: amount || 1 };

    const now = Date.now();
    const existing = this.state.get(ruleId);
    const cooldownMs = cooldownSeconds * 1000;

    if (!existing || now - existing.lastFiredAt >= cooldownMs) {
      this.state.set(ruleId, { lastFiredAt: now, accumulated: 0 });
      return { allowed: true, multiplier: amount || 1 };
    }

    switch (strategy) {
      case "ACCUMULATE":
      case "ESCALATE":
        existing.accumulated += amount || 1;
        return { allowed: false, multiplier: existing.accumulated };
      case "IGNORE":
      default:
        return { allowed: false, multiplier: 0 };
    }
  }

  reset(ruleId: string): void {
    this.state.delete(ruleId);
  }
}

export const cooldownManager = new CooldownManager();
