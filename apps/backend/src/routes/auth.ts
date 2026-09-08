import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { env } from "../config/env";
import { signDashboardToken } from "../security/auth";

const LoginSchema = z.object({ username: z.string(), password: z.string() });

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Single admin login for the MVP dashboard, backed by env-configured
 * credentials (DASHBOARD_ADMIN_USER/PASSWORD). Multi-user auth with hashed
 * passwords in the `users` table is a straightforward extension once
 * multiple operators are needed — the schema is already in place.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload" });

    const { username, password } = parsed.data;
    const validUser = timingSafeStringEqual(username, env.DASHBOARD_ADMIN_USER);
    const validPass = timingSafeStringEqual(password, env.DASHBOARD_ADMIN_PASSWORD);
    if (!validUser || !validPass) return reply.code(401).send({ error: "Invalid credentials" });

    return { token: signDashboardToken(username) };
  });
}
