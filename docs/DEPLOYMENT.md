# Deployment

## Local, with Docker Compose

```bash
cp .env.example .env   # fill in real secrets — see docs/SECURITY.md
docker compose -f docker/docker-compose.yml run --rm migrate   # apply DB schema once (and after any new migration file)
docker compose -f docker/docker-compose.yml up --build
```

This starts Postgres, Redis (reserved for future use), the backend
(`:4000`), and the dashboard (`:3000`). The `migrate` service is defined
with `profiles: ["tools"]` so `docker compose up` never re-runs it by
accident — run it explicitly whenever `apps/backend/src/db/migrations/`
gains a new file.

## Production notes

- **Reverse proxy / TLS**: put nginx, Caddy, or your cloud provider's load
  balancer in front of both the backend and dashboard containers, terminating
  HTTPS. Update `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` (dashboard build
  args) and `CORS_ORIGIN` (backend env) to the real HTTPS origins.
- **Secrets**: never bake real secrets into the Docker image or commit them.
  Pass them via your platform's secret manager into the container's
  environment (the images read everything from `process.env` — see
  `apps/backend/src/config/env.ts`).
- **Database**: `DATABASE_URL` must point at a real, backed-up Postgres
  instance. The in-memory fallback mode is for local testing only — using it
  in production means every restart loses all rules, events, and blocked
  users.
- **Roblox connectivity**: the deployed backend's `https://your-domain` (not
  `localhost`) must be reachable from Roblox's cloud infrastructure —
  `Config.BackendBaseUrl` in the Roblox game needs updating accordingly, and
  `Config.EnableDebugCommands` must stay `false` (it already defaults to
  `RunService:IsStudio()`, which is false on a published server — do not
  override this).
- **Scaling**: the MVP's event bus (`events/eventBus.ts`) and command queue
  (`commands/commandQueue.ts`) are in-process, single-instance. Running
  multiple backend replicas behind a load balancer will split state across
  instances (a Roblox poll might hit an instance that doesn't have the
  command another instance just queued). `REDIS_URL` is reserved in the
  config for exactly this — replacing the in-process `EventEmitter`/queue
  with Redis pub/sub and a Redis-backed queue is the documented next step
  before horizontally scaling the backend; it is out of scope for the MVP,
  which is designed to run as a single backend instance.
- **Health checks**: `GET /health` (liveness) and `GET /ready` (readiness,
  reports storage backend) are wired into the Docker Compose healthcheck and
  suitable for Kubernetes probes too.
- **Logs**: structured JSON via `pino` in production (`NODE_ENV=production`
  disables the pretty-printer); ship container stdout to your log
  aggregator of choice.

## Rebuilding after code changes

```bash
docker compose -f docker/docker-compose.yml up --build backend dashboard
```

## Rolling back a migration

Migrations in this MVP are forward-only (`0001_init.sql`, etc.), tracked in
the `schema_migrations` table. Write a new migration file to undo/adjust
schema changes rather than editing an already-applied one.
