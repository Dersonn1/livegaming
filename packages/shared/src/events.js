"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveEventSchema = exports.LiveEventType = exports.LiveProviderName = void 0;
const zod_1 = require("zod");
/**
 * Providers a live event can originate from. SIMULATOR is a first-class
 * provider (not a special-cased code path) so the Live Simulator exercises
 * the exact same pipeline as a real TikTok/YouTube connection.
 */
exports.LiveProviderName = zod_1.z.enum(["TIKTOK", "YOUTUBE", "SIMULATOR"]);
/**
 * Not every provider emits every event type (e.g. TikTok has no
 * MEMBERSHIP-style paid subscription tiers like YouTube). Providers only
 * emit the subset they actually support; the Rule Engine treats unknown
 * combinations as simply "never fires", never as an error.
 */
exports.LiveEventType = zod_1.z.enum([
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
exports.LiveEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    provider: exports.LiveProviderName,
    type: exports.LiveEventType,
    userId: zod_1.z.string(),
    username: zod_1.z.string(),
    amount: zod_1.z.number().finite().nonnegative().default(0),
    message: zod_1.z.string().max(2000).default(""),
    timestamp: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
