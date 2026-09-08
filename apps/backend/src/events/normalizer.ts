import { randomUUID } from "node:crypto";
import { LiveEvent, LiveEventSchema, LiveEventType, LiveProviderName } from "@live/shared";

export interface NormalizeInput {
  provider: LiveProviderName;
  type: LiveEventType;
  userId: string;
  username: string;
  amount?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Every provider adapter funnels its raw payload through this function.
 * It is the ONLY place a LiveEvent object gets constructed, which is what
 * guarantees the Simulator and real providers produce identical shapes.
 */
export function normalizeEvent(input: NormalizeInput): LiveEvent {
  const candidate = {
    id: randomUUID(),
    provider: input.provider,
    type: input.type,
    userId: input.userId,
    username: input.username,
    amount: input.amount ?? 0,
    message: input.message ?? "",
    timestamp: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
  return LiveEventSchema.parse(candidate);
}
