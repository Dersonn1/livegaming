import { LiveEvent } from "@live/shared";
import { RuleEngine } from "./rules/ruleEngine";
import { cooldownManager } from "./rules/cooldownManager";
import { processMatchedActions } from "./commands/commandService";
import { ruleRepository, eventRepository, blockedUserRepository } from "./db";
import { eventDeduplicator, eventDedupeKey } from "./security/idempotency";
import { LikeAggregator } from "./events/aggregator";
import { publishLiveEvent } from "./events/eventBus";
import { logger } from "./logging/logger";

const ruleEngine = new RuleEngine(cooldownManager);
const likeAggregator = new LikeAggregator(100);

export interface PipelineResult {
  event: LiveEvent;
  blocked: boolean;
  duplicate: boolean;
  commandsQueued: number;
}

/**
 * THE single entry point every LiveEvent — from TikTok, YouTube, or the
 * Live Simulator — must pass through. There is no separate "simulator
 * logic"; SimulatorProvider.emit() calls processIncomingEvent() exactly
 * like the real provider adapters do (wired in server.ts).
 *
 * Order: block-list check -> dedup -> persistence -> aggregation
 * (like milestones) -> rule engine -> command queueing -> broadcast.
 */
export async function processIncomingEvent(event: LiveEvent): Promise<PipelineResult> {
  const blocked = await blockedUserRepository.isBlocked(event.userId, event.provider);
  if (blocked) {
    logger.info({ userId: event.userId, provider: event.provider }, "Ignored event from blocked user");
    return { event, blocked: true, duplicate: false, commandsQueued: 0 };
  }

  const duplicate = eventDeduplicator.checkAndRecord(eventDedupeKey(event));
  if (duplicate) {
    return { event, blocked: false, duplicate: true, commandsQueued: 0 };
  }

  await eventRepository.save(event);
  publishLiveEvent(event);

  const rules = await ruleRepository.list();
  let commandsQueued = 0;

  const directMatches = ruleEngine.evaluate(event, rules);
  commandsQueued += processMatchedActions(event, directMatches).length;

  const milestoneEvent = likeAggregator.ingest(event);
  if (milestoneEvent) {
    await eventRepository.save(milestoneEvent);
    publishLiveEvent(milestoneEvent);
    const milestoneMatches = ruleEngine.evaluate(milestoneEvent, rules);
    commandsQueued += processMatchedActions(milestoneEvent, milestoneMatches).length;
  }

  return { event, blocked: false, duplicate: false, commandsQueued };
}
