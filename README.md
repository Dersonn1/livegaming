# Live → Roblox Interactive Platform

Connects a TikTok LIVE and/or YouTube LIVE stream to a Roblox game: viewer
actions (gifts, likes, follows, comments, donations, memberships) are turned
into real, rate-limited, authenticated commands executed inside the game
(spawn enemies/bosses, meteor showers, gravity/speed changes, and more).

```
LIVE (TikTok/YouTube) → Event Adapter → Normalizer → Rule Engine
   → Command Queue → Roblox Gateway (polling) → Roblox Game Server
```

A **Live Simulator** lets you test the entire pipeline — end to end, through
the exact same code path as a real LIVE — without connecting anything real.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and
[docs/SECURITY.md](docs/SECURITY.md) for how Roblox is protected from
receiving unauthenticated/forged commands.

## Project layout

```
apps/backend      Node.js + TypeScript + Fastify API, Rule Engine, Roblox Gateway
apps/dashboard    Next.js + Tailwind operator dashboard
packages/shared   Shared TypeScript types/schemas (Zod) used by the backend and, conceptually, mirrored in Roblox
roblox/game       Luau source for the Roblox game (Rojo project)
docker/           docker-compose.yml + Dockerfiles
docs/             Full documentation set
```

## 1. Prerequisites

- Node.js 20+ and npm 10+
- Docker + Docker Compose (optional — only needed for Postgres/Redis/containerized runs)
- Roblox Studio, and optionally [Rojo](https://rojo.space/) to sync `roblox/game` into a place file
- A TikTok and/or YouTube account if you intend to connect a real LIVE (fully optional — the Live Simulator needs none of this)

## 2. Install

```bash
npm install
```

This installs all workspaces (`apps/backend`, `apps/dashboard`, `packages/shared`) in one pass.

## 3. Configure

```bash
cp .env.example .env
cp .env.example apps/backend/.env
```

Edit `apps/backend/.env`. For a first local run you can leave `DATABASE_URL`
and `REDIS_URL` empty — the backend automatically falls back to an in-memory
store (data resets on restart, which is fine for testing). Everything else
has a working development default except the two secrets
(`JWT_SECRET`, `ROBLOX_COMMAND_SIGNING_SECRET`) which you should still change
before anything beyond local testing. See [docs/SETUP.md](docs/SETUP.md) for
the full walkthrough and [docs/SECURITY.md](docs/SECURITY.md) for what each
secret protects.

## 4. Run the backend

```bash
npm run dev:backend
```

Starts on `http://localhost:4000`. On first boot it seeds three example
rules (Gift "rose" → Spawn Enemy, 100 Likes → Spawn Boss, "!meteor" comment
→ Meteor Shower) so the MVP works immediately.

## 5. Run the dashboard

```bash
npm run dev:dashboard
```

Open `http://localhost:3000`, log in with `DASHBOARD_ADMIN_USER` /
`DASHBOARD_ADMIN_PASSWORD` from your `.env` (defaults: `admin` / `admin`).

## 6. Test with the Live Simulator (no TikTok/YouTube needed)

In the dashboard, go to **Simulator** and click a quick action (e.g. "Gift:
Rose"). Watch the **Dashboard** page's Live Activity feed and the **Events**
page update in real time. This event went through the identical pipeline a
real TikTok gift would.

## 7. Connect Roblox Studio

1. Open `roblox/game` with [Rojo](https://rojo.space/) (`rojo serve` + the
   Rojo Studio plugin, or `rojo build -o game.rbxlx` to open directly).
2. In Studio, enable **Game Settings → Security → Allow HTTP Requests**.
3. Edit `roblox/game/src/ServerScriptService/Security/Config.lua`: set
   `ApiKey` and `CommandSigningSecret` to match your backend `.env`
   (`ROBLOX_API_KEY` / `ROBLOX_COMMAND_SIGNING_SECRET`).
4. Press Play. The Output window should print
   `[LiveInteractive] Connected to backend at http://localhost:4000`.
5. Trigger a Simulator event again — within `PollIntervalSeconds` (default
   1.5s) you should see the enemy/boss/meteor spawn in Workspace.

Full details, including the Roblox↔backend communication design decision
(why polling, not push), are in [docs/ROBLOX.md](docs/ROBLOX.md).

## 8. Connect a real LIVE

- **YouTube** (official API): see [docs/YOUTUBE.md](docs/YOUTUBE.md).
- **TikTok** (no official third-party API — read this before relying on it):
  see [docs/TIKTOK.md](docs/TIKTOK.md).

Then in the dashboard's **Live** page, enter the channel/username and click
Connect.

## Testing

```bash
npm run test -w @live/backend
```

35 unit/integration tests cover the Rule Engine, cooldowns, anti-spam
aggregation/deduplication, command validation, the full event pipeline
(including blocked users and duplicate suppression), command signing, and
HTTP authentication (dashboard JWT + Roblox API key).

## Running everything with Docker

```bash
cp .env.example .env   # fill in real secrets first
docker compose -f docker/docker-compose.yml run --rm migrate   # apply DB schema once
docker compose -f docker/docker-compose.yml up --build
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production notes.

## Documentation index

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full pipeline design, module responsibilities, data model |
| [docs/SETUP.md](docs/SETUP.md) | Detailed local setup, every env var explained |
| [docs/ROBLOX.md](docs/ROBLOX.md) | Roblox↔backend communication design & limitations, Studio setup |
| [docs/TIKTOK.md](docs/TIKTOK.md) | TikTok LIVE integration status and its real limitations |
| [docs/YOUTUBE.md](docs/YOUTUBE.md) | YouTube LIVE integration (official API), setup and coverage |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model and every control in place |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker/production deployment notes |
