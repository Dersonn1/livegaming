# Setup Guide

## 1. Prerequisites

- Node.js 20+, npm 10+
- (Optional) Docker + Docker Compose, for Postgres/Redis or containerized runs
- (Optional) [Rojo](https://rojo.space/) for syncing `roblox/game` into Roblox Studio
- Roblox Studio

## 2. Install dependencies

```bash
npm install
```

This is an npm workspaces monorepo (`apps/backend`, `apps/dashboard`,
`packages/shared`) — one install covers everything.

## 3. Environment variables

Copy the template:

```bash
cp .env.example .env
cp .env.example apps/backend/.env
```

`apps/backend/.env` is what the backend actually reads (via `dotenv`). The
root `.env` is used by `docker compose` (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

| Variable | Required? | Purpose |
|---|---|---|
| `NODE_ENV` | No (default `development`) | Enables pretty logs and provider stubs meant for testing. |
| `PORT` | No (default `4000`) | Backend HTTP/WebSocket port. |
| `DATABASE_URL` | **No** | Omit for in-memory storage (data resets on restart) — recommended for first-time testing. Set to a Postgres URL for persistence. |
| `REDIS_URL` | No | Reserved for a future horizontally-scaled event bus; unused by the MVP's single-instance in-process bus. |
| `JWT_SECRET` | **Yes**, before any non-local use | Signs dashboard login tokens. |
| `DASHBOARD_ADMIN_USER` / `DASHBOARD_ADMIN_PASSWORD` | **Yes**, before any non-local use | The single MVP dashboard login. |
| `ROBLOX_API_KEY` | **Yes**, before any non-local use | Bootstrap API key Roblox sends as `X-Roblox-Api-Key`. Additional per-game keys can be minted from the dashboard's Settings page. |
| `ROBLOX_COMMAND_SIGNING_SECRET` | **Yes**, before any non-local use | HMAC secret signing every command batch; must match `roblox/game/src/ServerScriptService/Security/Config.lua`. |
| `ROBLOX_GAME_ID` / `ROBLOX_PLACE_ID` | No | Informational/for future Open Cloud use. |
| `ROBLOX_OPEN_CLOUD_API_KEY` | No | Only needed if you extend the platform with Roblox Open Cloud APIs. |
| `TIKTOK_SIGN_API_KEY`, `TIKTOK_DEFAULT_USERNAME` | No | See [TIKTOK.md](./TIKTOK.md) — TikTok has no official third-party events API. |
| `YOUTUBE_API_KEY` | Only for YouTube LIVE | See [YOUTUBE.md](./YOUTUBE.md). |
| `CORS_ORIGIN` | No (default `http://localhost:3000`) | Must match the dashboard's origin. |
| `COMMAND_EXPIRY_SECONDS` | No (default `15`) | How long a queued command is valid before Roblox must reject it. |
| `ROBLOX_POLL_MAX_COMMANDS` | No (default `20`) | Max commands returned per Roblox poll. |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | Dashboard only | Where the dashboard reaches the backend. Safe to expose (no secrets). |

## 4. Database (optional for local testing)

Skip this section entirely to run fully in-memory.

With Docker:

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

Then set `DATABASE_URL` in `apps/backend/.env` to
`postgresql://live_user:live_password@localhost:5432/live_platform` and run:

```bash
npm run migrate -w @live/backend
```

## 5. Run the backend

```bash
npm run dev:backend
```

Verify: `curl http://localhost:4000/health` → `{"status":"ok",...}`.

Three example rules are seeded automatically on first boot (see
`apps/backend/src/rules/seed.ts`) so the MVP scenarios work immediately.

## 6. Run the dashboard

```bash
npm run dev:dashboard
```

Open http://localhost:3000, log in with the credentials from
`DASHBOARD_ADMIN_USER`/`DASHBOARD_ADMIN_PASSWORD`.

## 7. Roblox Studio

See [ROBLOX.md](./ROBLOX.md) for the full walkthrough (Rojo sync, enabling
HTTP requests, filling in `Config.lua`).

## 8. Running the test suite

```bash
npm run test -w @live/backend
```

## 9. Connecting a real LIVE

See [TIKTOK.md](./TIKTOK.md) and [YOUTUBE.md](./YOUTUBE.md).

## 10. Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md).
