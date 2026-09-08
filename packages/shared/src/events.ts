import { z } from "zod";

/**
 * Providers a live event can originate from. SIMULATOR is a first-class
 * provider (not a special-cased code path) so the Live Simulator exercises
 * the exact same pipeline as a real TikTok/YouTube connection.
 */
export const LiveProviderName = z.enum(["TIKTOK", "YOUTUBE", "SIMULATOR"]);
export type LiveProviderName = z.infer<typeof LiveProviderName>;

/**
 * Not every provider emits every event type (e.g. TikTok has no
 * MEMBERSHIP-style paid subscription tiers like YouTube). Providers only
 * emit the subset they actually support; the Rule Engine treats unknown
 * combinations as simply "never fires", never as an error.
 */
export const LiveEventType = z.enum([
  "FOLLOW",
  "LIKE",
  "LIKE_MILESTONE",
  "COMMENT",
  "GIFT",
  "DONATION",
  "SUBSCRIPTION",
  "MEMBERSHIP",
  "SHARE",
  "JOIN",
]);
export type LiveEventType = z.infer<typeof LiveEventType>;

export const LiveEventSchema = z.object({
  id: z.string().uuid(),
  provider: LiveProviderName,
  type: LiveEventType,
  userId: z.string(),
  username: z.string(),
  amount: z.number().finite().nonnegative().default(0),
  message: z.string().max(2000).default(""),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});
export type LiveEvent = z.infer<typeof LiveEventSchema>;

/** Raw payload emitted by a provider adapter before normalization. */
export interface RawProviderEvent {
  provider: LiveProviderName;
  raw: unknown;
}
