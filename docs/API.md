# API Reference

Base URL: `http://localhost:4000` (local). All request/response bodies are
JSON. Dashboard-facing endpoints require `Authorization: Bearer <token>`
from `POST /api/auth/login`. Roblox-facing endpoints require
`X-Roblox-Api-Key: <key>`.

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Liveness check. |
| GET | `/ready` | none | Readiness + reports `storage: "postgres" \| "in-memory"`. |

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | `{ username, password }` | Returns `{ token }` (12h JWT). Credentials from `DASHBOARD_ADMIN_USER`/`PASSWORD`. |

## Live control

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/live/status` | dashboard | — returns per-provider `{ status, channel, lastEventAt, error }` |
| POST | `/api/live/connect` | dashboard | `{ provider: "TIKTOK"\|"YOUTUBE"\|"SIMULATOR", channel: string }` |
| POST | `/api/live/disconnect` | dashboard | `{ provider }` |

## Events

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/events?limit=100` | dashboard | Most recent normalized `LiveEvent`s, newest first. |
| GET | `/api/events/stats` | dashboard | `{ eventsPerMinute, eventsLastHour }` |

## Rules

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/rules` | dashboard | — |
| POST | `/api/rules` | dashboard | `RuleCreateInput` (see `packages/shared/src/rules.ts`) |
| PUT | `/api/rules/:id` | dashboard | Partial `RuleCreateInput` |
| DELETE | `/api/rules/:id` | dashboard | — |

## Commands

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/commands` | dashboard | Lists all `GameCommandType`s with default cooldowns. |
| POST | `/api/commands/test` | dashboard | `{ type: GameCommandType, params?: object, priority?: "HIGH"\|"NORMAL"\|"LOW" }` — queues a real command. |
| GET | `/api/logs?limit=100` | dashboard | Command execution log, newest first. |

## Simulator

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/simulator/event` | dashboard | `{ type: LiveEventType, username, userId?, amount?, message?, metadata? }` — goes through the real pipeline. |

## Roblox gateway

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/roblox/register` | dashboard | `{ name, placeId? }` → `{ apiKey, warning }`. Key shown once. |
| GET | `/api/roblox/status` | dashboard | `{ connected, lastPollAt, pendingCommands }` |
| GET | `/api/roblox/commands` | Roblox API key | Returns `CommandBatchEnvelope`: `{ commands[], issuedAt, signedPayload, signature }`. |
| POST | `/api/roblox/ack` | Roblox API key | `{ commandId, status: "SUCCESS"\|"FAILED"\|"REJECTED", error?, executedAt }` |

## Blocked users

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/blocked-users` | dashboard | — |
| POST | `/api/blocked-users` | dashboard | `{ userId, username, provider, reason? }` |
| DELETE | `/api/blocked-users/:provider/:userId` | dashboard | — |

## WebSocket

`ws://localhost:4000/ws` — dashboard real-time feed. No auth on the socket
itself in the MVP (read-only fan-out, no control-plane actions accepted over
this channel); restrict network access to it the same way you would the
dashboard itself in a non-local deployment. Messages:

```jsonc
{ "type": "connected" }
{ "type": "live_event", "data": LiveEvent }
{ "type": "command_log", "data": CommandLogEntry }
```
