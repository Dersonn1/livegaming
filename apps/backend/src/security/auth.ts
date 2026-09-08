import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { gameConnectionRepository } from "../db";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export interface DashboardTokenPayload {
  sub: string;
  role: "admin";
}

export function signDashboardToken(username: string): string {
  const payload: DashboardTokenPayload = { sub: username, role: "admin" };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "12h" });
}

/**
 * Dashboard-facing routes (rules CRUD, commands test, simulator, logs) all
 * require a valid JWT issued by POST /api/auth/login. This is what stops an
 * arbitrary internet user from hitting e.g. POST /api/commands/test and
 * controlling the game directly, per the project's security requirements.
 */
export async function requireDashboardAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing bearer token" });
    return reply as never;
  }
  const token = header.slice("Bearer ".length);
  try {
    jwt.verify(token, env.JWT_SECRET);
  } catch {
    reply.code(401).send({ error: "Invalid or expired token" });
    return reply as never;
  }
}

/**
 * Roblox-facing routes (poll/ack) authenticate with a static API key instead
 * of a JWT, since the Roblox game server cannot go through an interactive
 * login flow. The key is sent as `X-Roblox-Api-Key` and compared using a
 * timing-safe check.
 */
export async function requireRobloxApiKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const key = req.headers["x-roblox-api-key"];
  if (typeof key !== "string" || key.length === 0) {
    reply.code(401).send({ error: "Invalid or missing Roblox API key" });
    return reply as never;
  }

  if (timingSafeStringEqual(key, env.ROBLOX_API_KEY)) return;

  const keyHash = hashApiKey(key);
  const validDynamicKey = await gameConnectionRepository.isValidKeyHash(keyHash);
  if (validDynamicKey) {
    await gameConnectionRepository.touchLastSeen(keyHash);
    return;
  }

  reply.code(401).send({ error: "Invalid or missing Roblox API key" });
  return reply as never;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
