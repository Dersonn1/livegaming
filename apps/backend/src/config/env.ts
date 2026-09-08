import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4000),

  // Persistence. If DATABASE_URL is absent the backend falls back to an
  // in-memory repository so the whole system can be exercised locally
  // (Live Simulator included) with zero external services.
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16).default("dev-only-insecure-secret-change-me"),
  DASHBOARD_ADMIN_USER: z.string().default("admin"),
  DASHBOARD_ADMIN_PASSWORD: z.string().default("admin"),

  // Roblox <-> backend authentication. Each registered Roblox game
  // connection gets its own API key (see /api/roblox/register); this one
  // is the bootstrap key used before any dynamic keys exist.
  ROBLOX_API_KEY: z.string().default("dev-roblox-api-key-change-me"),
  ROBLOX_COMMAND_SIGNING_SECRET: z.string().default("dev-signing-secret-change-me"),
  ROBLOX_GAME_ID: z.string().optional(),
  ROBLOX_PLACE_ID: z.string().optional(),
  ROBLOX_OPEN_CLOUD_API_KEY: z.string().optional(),

  TIKTOK_SIGN_API_KEY: z.string().optional(),
  TIKTOK_DEFAULT_USERNAME: z.string().optional(),

  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_DEFAULT_CHANNEL_ID: z.string().optional(),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COMMAND_EXPIRY_SECONDS: z.coerce.number().int().default(15),
  ROBLOX_POLL_MAX_COMMANDS: z.coerce.number().int().default(20),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
