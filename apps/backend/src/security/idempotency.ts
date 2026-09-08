import { Deduplicator } from "../events/aggregator";

/**
 * Guards against the same logical event being processed twice — e.g. a
 * provider adapter redelivering a message after a reconnect, or a
 * double-submitted simulator click. Keyed on provider+userId+type+message,
 * NOT on the generated event id (which is always unique and therefore
 * useless for this check).
 */
export const eventDeduplicator = new Deduplicator(4000);

export function eventDedupeKey(input: { provider: string; userId: string; type: string; message?: string }): string {
  return `${input.provider}:${input.userId}:${input.type}:${input.message ?? ""}`;
}
