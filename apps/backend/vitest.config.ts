import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Tests must be hermetic: never depend on whatever a developer's local
    // apps/backend/.env happens to contain (Postgres/Redis URLs, rotated
    // secrets, etc.). These match config/env.ts's own schema defaults, so
    // tests exercise the same values regardless of local configuration.
    env: {
      DATABASE_URL: "",
      REDIS_URL: "",
      DASHBOARD_ADMIN_USER: "admin",
      DASHBOARD_ADMIN_PASSWORD: "admin",
      ROBLOX_API_KEY: "dev-roblox-api-key-change-me",
      JWT_SECRET: "dev-only-insecure-secret-change-me",
      ROBLOX_COMMAND_SIGNING_SECRET: "dev-signing-secret-change-me",
    },
  },
  resolve: {
    alias: {
      "@live/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});
