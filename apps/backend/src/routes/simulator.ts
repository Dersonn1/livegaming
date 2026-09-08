import { FastifyInstance } from "fastify";
import { z } from "zod";
import { LiveEventType } from "@live/shared";
import { requireDashboardAuth } from "../security/auth";
import { simulatorProvider } from "../providers/SimulatorProvider";

const SimulateSchema = z.object({
  type: LiveEventType,
  username: z.string().min(1).default("test_user"),
  userId: z.string().optional(),
  amount: z.number().optional(),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Live Simulator endpoint. Emits through SimulatorProvider, which is a real
 * LiveProvider implementation — the event takes the identical path through
 * normalizeEvent() -> processIncomingEvent() as a genuine TikTok/YouTube
 * event. There is no parallel/simplified logic here.
 */
export async function simulatorRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.post("/api/simulator/event", async (req, reply) => {
    const parsed = SimulateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { type, username, userId, amount, message, metadata } = parsed.data;
    const event = simulatorProvider.emit(userId ?? `sim_${username}`, {
      type,
      username,
      amount,
      message,
      metadata,
    });
    return reply.code(201).send(event);
  });
}
