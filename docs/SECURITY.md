# Security

## Threat model summary

The primary threat this platform defends against: **an arbitrary internet
user directly controlling the Roblox game**, e.g. by discovering
`POST /api/commands/test` or `GET /api/roblox/commands` and calling it
themselves. Secondary threats: a busy LIVE overwhelming the game server
(spam), and a single hostile viewer abusing the system (block-list).

## Controls, mapped to the requirement they satisfy

| Requirement | Control | Where |
|---|---|---|
| Dashboard routes require authentication | JWT bearer token, verified on every request | `security/auth.ts::requireDashboardAuth`, applied via `addHook("preHandler", ...)` on every dashboard route file |
| Roblox routes require authentication | Static bootstrap API key OR a dynamically registered per-game key (SHA-256-hashed at rest), timing-safe comparison | `security/auth.ts::requireRobloxApiKey` |
| Rate limiting | Global 300 req/min via `@fastify/rate-limit`, applied to all routes including the Roblox poll/ack endpoints | `src/app.ts` |
| CORS | Restricted to `CORS_ORIGIN` (the dashboard's own origin) | `src/app.ts` |
| Input validation | Every request body/params validated with Zod before touching business logic | every `routes/*.ts` file, `packages/shared/src/*.ts` schemas |
| Commands signed | HMAC-SHA256 over the exact JSON payload sent to Roblox | `roblox/signing.ts` (backend), `ReplicatedStorage/Shared/Sha256.lua` + `ServerScriptService/Security/SecurityService.lua` (Roblox) |
| Commands expire | Every `GameCommand.expiresAt` (default 15s from creation); Roblox independently checks it and the queue itself drops expired commands rather than delivering them | `commands/commandQueue.ts::dequeueBatch`, `SecurityService.isExpired` |
| Replay/duplicate command rejection | Each command carries a random `nonce`; Roblox remembers seen nonces for 2 minutes and rejects repeats. Acks are also deduplicated backend-side. | `SecurityService.checkAndRecordNonce`, `roblox/robloxGateway.ts::ack` |
| Duplicate LIVE-event rejection | Sliding-window dedup keyed on provider+userId+type+message (not the random event id) | `security/idempotency.ts`, used in `pipeline.ts` |
| Unauthorized Roblox request rejected | Verified by `test/http.test.ts` — a request with no key, or the wrong key, gets HTTP 401 before touching the command queue | `apps/backend/test/http.test.ts` |
| Anti-spam | Aggregation (LikeAggregator) + per-rule cooldowns + a second, independent Roblox-side cooldown | see [ARCHITECTURE.md](./ARCHITECTURE.md#anti-spam-design) |
| Block/ban abusive users | `blocked_users` table/repository; checked as the very first step of the pipeline, before anything else runs | `pipeline.ts::processIncomingEvent` |
| Secrets never in code | All secrets read from environment variables via a validated Zod schema; `.env.example` ships only placeholders | `config/env.ts` |
| Roblox secrets never reach clients | `Config.lua`/`SecurityService.lua` live under `ServerScriptService`, which Roblox never replicates to clients (unlike anything under `ReplicatedStorage`) | `roblox/game/src/ServerScriptService/Security/` |
| No client → server RemoteEvents for gameplay commands | `RemoteEvents.lua` only creates SERVER → CLIENT events (visual/audio feedback); there is no `OnServerEvent` handler anywhere that accepts a command from a client | `ReplicatedStorage/Remotes/RemoteEvents.lua` |
| Debug/test commands excluded from production | `DebugCommands.lua` is only required when `Config.EnableDebugCommands`, which defaults to `RunService:IsStudio()` — never true in a published server | `ServerScriptService/Security/Config.lua`, `Main.server.lua` |

## What HTTPS is expected to provide (and what doesn't rely on it)

Local development runs over plain HTTP. **Any non-local deployment must
terminate TLS in front of the backend** (reverse proxy / load balancer) —
this is what authenticates the backend's identity to Roblox and encrypts
the API key and JWTs in transit. The HMAC command signature is intentionally
independent of TLS: it protects payload integrity even in scenarios where
TLS is terminated somewhere you don't fully trust (a shared reverse proxy,
logging middleware, etc.) between Roblox and your application code.

## Known dependency advisories

Run `npm audit` periodically. As of this writing, remaining advisories are
either dev-only (`vitest`/`esbuild`/`vite`, not shipped to production) or in
`next`/`postcss` for Next.js App Router / Server Actions / Middleware /
Image Optimizer features **this project's Pages Router app does not use**.
Track them and upgrade opportunistically; none currently apply to the code
paths in this repository. `fastify` itself is kept on the latest patched 4.x
line.

## Operational recommendations before going beyond local testing

1. Change `JWT_SECRET`, `ROBLOX_COMMAND_SIGNING_SECRET`, `ROBLOX_API_KEY`,
   and `DASHBOARD_ADMIN_PASSWORD` to strong, unique random values.
2. Put the backend behind HTTPS.
3. Mint a dedicated Roblox API key per game/place via
   `POST /api/roblox/register` instead of sharing the bootstrap key.
4. Enable Postgres (`DATABASE_URL`) — the in-memory store has no durability
   and is meant for local testing only.
5. Restrict `CORS_ORIGIN` to your real dashboard domain.
