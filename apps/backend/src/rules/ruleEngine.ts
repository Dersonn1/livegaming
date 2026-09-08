import { LiveEvent, Rule, RuleAction, RuleCondition } from "@live/shared";
import { CooldownManager } from "./cooldownManager";

export interface MatchedAction {
  rule: Rule;
  action: RuleAction;
  multiplier: number;
}

function extractField(event: LiveEvent, field: RuleCondition["field"]): string | number | undefined {
  switch (field) {
    case "amount":
      return event.amount;
    case "giftName":
      return String(event.metadata?.giftName ?? "");
    case "username":
      return event.username;
    case "commentContains":
      return event.message;
    case "likesTotal":
      return Number(event.metadata?.totalLikes ?? event.amount ?? 0);
  }
}

function evaluateCondition(event: LiveEvent, condition: RuleCondition): boolean {
  const fieldValue = extractField(event, condition.field);

  if (condition.field === "commentContains") {
    return String(fieldValue ?? "").toLowerCase().includes(condition.value.toLowerCase());
  }
  if (condition.field === "giftName" || condition.field === "username") {
    return String(fieldValue ?? "").toLowerCase() === condition.value.toLowerCase();
  }

  const numeric = Number(fieldValue ?? 0);
  switch (condition.op) {
    case "eq":
      return numeric === condition.value;
    case "ne":
      return numeric !== condition.value;
    case "gt":
      return numeric > condition.value;
    case "gte":
      return numeric >= condition.value;
    case "lt":
      return numeric < condition.value;
    case "lte":
      return numeric <= condition.value;
    default:
      return false;
  }
}

/**
 * Pure, side-effect-free rule matcher plus cooldown gating. Kept independent
 * of persistence/queueing so it is trivially unit-testable (see
 * test/ruleEngine.test.ts) and reusable from both the live pipeline and the
 * "test a rule" dashboard action.
 */
export class RuleEngine {
  constructor(private cooldown: CooldownManager) {}

  evaluate(event: LiveEvent, rules: Rule[]): MatchedAction[] {
    const matched: MatchedAction[] = [];

    const candidates = rules
      .filter((r) => r.enabled)
      .filter((r) => !r.provider || r.provider === event.provider)
      .filter((r) => r.eventType === event.type)
      .filter((r) => r.conditions.every((c) => evaluateCondition(event, c)))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of candidates) {
      const result = this.cooldown.check(rule.id, rule.cooldownSeconds, rule.cooldownStrategy, event.amount);
      if (!result.allowed) continue;
      matched.push({ rule, action: rule.action, multiplier: result.multiplier });
    }

    return matched;
  }
}
