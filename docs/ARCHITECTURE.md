# Architecture

## Pipeline overview

```
 TikTok LIVE      YouTube LIVE      Live Simulator (dashboard)
      |                |                    |
      v                v                    v
 TikTokProvider   YouTubeProvider     SimulatorProvider     <- implement LiveProvider interface
      \_______________  |  __________________/
                      \ | /
                 normalizeEvent()                            <- events/normalizer.ts: the ONLY place a LiveEvent is built
                        |
                        v
              processIncomingEvent()                         <- src/pipeline.ts: THE single entry point
                        |
        +---------------+----------------+
        |  1. blocked-user check         |
        |  2. dedup (idempotency)        |
        |  3. persist + WS broadcast     |
        |  4. LikeAggregator (milestones)|
        |  5. RuleEngine.evaluate()      |
        +---------------+----------------+
                        |
                        v
              CooldownManager gate (per rule)
                        |
                        v
           buildAndEnqueueCommand()                          <- validates payload via CommandHandler registry
                        |
                        v
                 CommandQueue (priority: HIGH/NORMAL/LOW)
                        |
                        v
        Roblox polls GET /api/roblox/commands (HMAC-signed)
                        |
                        v
      Roblox: SecurityService verifies signature/expiry/nonce
                        |
                        v
         CommandHandlers[type](payload) executes in-game
                        |
                        v
           POST /api/roblox/ack  ->  command_logs + WebSocket -> Dashboard
```

There is exactly **one** path from "something happened on the LIVE" to "a
command reached Roblox." The Live Simulator is not a parallel/simplified
mock — `SimulatorProvider` implements the same `LiveProvider` interface as
`TikTokProvider`/`YouTubeProvider` and feeds the same `processIncomingEvent`
entry point.

## Why this decoupling

The backend never trusts the Roblox client, and the Roblox client never
executes anything it received directly from a "spawn boss" HTTP call typed
by a random person — every command:

1. Is generated only by the Rule Engine (from a real LiveEvent) or by an
   authenticated dashboard operator's manual "test command" call.
2. Is placed on an internal queue, not sent directly to any endpoint.
3. Is fetched by Roblox itself via an authenticated pull (see
   [ROBLOX.md](./ROBLOX.md) for why pull, not push).
4. Is independently re-validated by Roblox (signature, expiry, nonce,
   payload shape) before any handler runs.

## Module responsibilities (backend)

| Module | Responsibility |
|---|---|
| `providers/*` | One adapter per LIVE platform, all implementing `LiveProvider`. Convert platform-specific payloads into `normalizeEvent()` calls. |
| `events/normalizer.ts` | The single LiveEvent constructor + Zod validation. |
| `events/aggregator.ts` | `LikeAggregator` (turns bursts of small events into one milestone event) and `Deduplicator` (sliding-window dedup, reused for both events and Roblox ack idempotency). |
| `pipeline.ts` | Orchestrates block-list → dedup → persistence → aggregation → rule evaluation → command creation, for every event regardless of source. |
| `rules/ruleEngine.ts` | Pure condition matching (`Rule.conditions` against a `LiveEvent`), independent of persistence/queueing — easy to unit test. |
| `rules/cooldownManager.ts` | Per-rule cooldown gating with IGNORE/ACCUMULATE/ESCALATE strategies. |
| `commands/CommandHandler.ts` | One entry per `GameCommandType`: its Zod payload schema + a `buildPayload` normalizer. A `Map` registry — adding a command type never touches existing ones. |
| `commands/commandQueue.ts` | In-memory priority queue Roblox drains via polling; drops expired commands instead of ever delivering them. |
| `commands/commandService.ts` | Turns a matched rule action (or a manual dashboard test) into a validated `GameCommand` and enqueues it. |
| `roblox/robloxGateway.ts` | Server-side half of the polling protocol: builds signed batches, processes acks. |
| `roblox/signing.ts` | HMAC-SHA256 command batch signing (`ROBLOX_COMMAND_SIGNING_SECRET`). |
| `security/auth.ts` | Dashboard JWT verification + Roblox API key verification (static bootstrap key or dynamically registered per-game keys). |
| `security/idempotency.ts` | Event-level dedup key derivation used by the pipeline. |
| `db/repositories.ts` + `db/index.ts` | Every repository has an in-memory implementation (zero-config local dev/tests) and a Postgres implementation, selected once based on `DATABASE_URL`. |
| `ws/wsServer.ts` | Fans out `LiveEvent`s and command-log entries to connected dashboard browsers in real time. |

## Data model (Postgres)

See `apps/backend/src/db/migrations/0001_init.sql` for the authoritative
schema: `users`, `live_sessions`, `live_events`, `rules`, `rule_actions`,
`commands`, `command_logs`, `blocked_users`, `game_connections`, with indexes
on the columns the dashboard's list/filter/stat queries actually use
(`live_events(created_at)`, `live_events(provider, type)`,
`command_logs(created_at)`, `rules(event_type) WHERE enabled`,
`commands(status, priority)`).

## Anti-spam design

A LIVE with thousands of concurrent viewers can produce thousands of raw
events per second. Two independent mechanisms prevent that from becoming
thousands of Roblox commands:

- **Aggregation** (`LikeAggregator`): raw `LIKE` events accumulate into a
  running total; a synthetic `LIKE_MILESTONE` event is emitted only when a
  configurable step (default 100) is crossed — never once per like.
- **Cooldowns** (`CooldownManager`, plus a second independent layer in
  Roblox's own `CooldownService.lua`): a rule with `cooldownSeconds > 0`
  either drops (`IGNORE`), sums (`ACCUMULATE`), or compounds (`ESCALATE`)
  events that arrive while it's already cooling down, instead of firing a
  command per event.

Both layers are pure/stateless-per-call and unit tested independently
(`test/aggregator.test.ts`, `test/cooldown.test.ts`).

## Extending to a new LIVE platform

Implement `LiveProvider` (`connect`, `disconnect`, `getState`, `onEvent`),
call `normalizeEvent()` for anything you receive, and register it in
`providers/liveManager.ts`. Nothing else in the pipeline changes.

## Extending with a new Roblox command

1. Add the type name to `GameCommandType` in `packages/shared/src/commands.ts`
   and to `roblox/game/src/ReplicatedStorage/Shared/CommandTypes.lua`.
2. Add a `CommandHandler` entry in `apps/backend/src/commands/CommandHandler.ts`
   (payload schema + default cooldown + `buildPayload`).
3. Add a handler function in
   `roblox/game/src/ServerScriptService/Commands/CommandHandlers.lua`.

No existing rule, queue, or security code needs to change.
