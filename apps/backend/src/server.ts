import { env } from "./config/env";
import { logger } from "./logging/logger";
import { buildApp } from "./app";
import { wireProviders } from "./providers/liveManager";
import { seedDefaultRules } from "./rules/seed";

async function main() {
  const app = await buildApp();

  wireProviders();
  await seedDefaultRules();

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Backend listening on http://localhost:${env.PORT}`);
  logger.info(`WebSocket endpoint: ws://localhost:${env.PORT}/ws`);
}

main().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});
