import { isPersistentStorageEnabled } from "./pool";
import {
  BlockedUserRepository,
  CommandLogRepository,
  EventRepository,
  GameConnectionRepository,
  InMemoryBlockedUserRepository,
  InMemoryCommandLogRepository,
  InMemoryEventRepository,
  InMemoryGameConnectionRepository,
  InMemoryRuleRepository,
  PostgresBlockedUserRepository,
  PostgresCommandLogRepository,
  PostgresEventRepository,
  PostgresGameConnectionRepository,
  PostgresRuleRepository,
  RuleRepository,
} from "./repositories";
import { logger } from "../logging/logger";

const persistent = isPersistentStorageEnabled();
if (persistent) {
  logger.info("Persistent storage enabled (PostgreSQL).");
} else {
  logger.warn("DATABASE_URL not set — using in-memory storage (data resets on restart).");
}

export const ruleRepository: RuleRepository = persistent
  ? new PostgresRuleRepository()
  : new InMemoryRuleRepository();

export const eventRepository: EventRepository = persistent
  ? new PostgresEventRepository()
  : new InMemoryEventRepository();

export const commandLogRepository: CommandLogRepository = persistent
  ? new PostgresCommandLogRepository()
  : new InMemoryCommandLogRepository();

export const blockedUserRepository: BlockedUserRepository = persistent
  ? new PostgresBlockedUserRepository()
  : new InMemoryBlockedUserRepository();

export const gameConnectionRepository: GameConnectionRepository = persistent
  ? new PostgresGameConnectionRepository()
  : new InMemoryGameConnectionRepository();
