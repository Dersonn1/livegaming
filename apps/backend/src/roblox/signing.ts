import crypto from "node:crypto";
import { env } from "../config/env";

/**
 * HMAC-SHA256 signing for command batches sent to Roblox. Roblox verifies
 * this signature with the same shared secret before executing anything,
 * which is what stops a network-level attacker (or anyone who guesses the
 * REST endpoint) from injecting arbitrary commands even if they somehow
 * obtain a valid poll response shape.
 */
export function signPayload(payload: string): string {
  return crypto.createHmac("sha256", env.ROBLOX_COMMAND_SIGNING_SECRET).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
