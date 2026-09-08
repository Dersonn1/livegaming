import { FastifyInstance } from "fastify";
import { requireDashboardAuth } from "../security/auth";
import { eventRepository } from "../db";

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.get("/api/events", async (req) => {
    const query = req.query as { limit?: string };
    const limit = Math.min(500, Number(query.limit) || 100);
    return eventRepository.list(limit);
  });

  app.get("/api/events/stats", async () => {
    const [lastMinute, lastHour] = await Promise.all([
      eventRepository.countSince(60_000),
      eventRepository.countSince(3_600_000),
    ]);
    return {
      eventsPerMinute: lastMinute,
      eventsLastHour: lastHour,
    };
  });
}
