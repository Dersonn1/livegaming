# Roblox Integration

## The core constraint (read this first)

A Roblox game server **cannot accept inbound network connections** — no
WebSocket server, no HTTP server, no listening socket of any kind. The only
network primitive available to in-game Luau code is **outbound HTTP requests
via `HttpService`**. Roblox does not offer a supported way for an external
service to push data into a running game server.

This rules out, for a live Roblox game server:

- ❌ A raw WebSocket connection from the backend to Roblox (not supported —
  Roblox is never the server side of a socket, and it cannot be the client
  side of a long-lived inbound-push connection either).
- ❌ The backend calling an HTTP endpoint "on" the Roblox server (there is no
  such endpoint to call).
- ❌ `MessagingService` for this use case — it publishes messages between
  **servers of the same experience** (cross-server, e.g. game server A to
  game server B), not from an arbitrary external backend into a game server.
- ❌ Open Cloud APIs for real-time command delivery — Open Cloud covers
  things like DataStores, Groups, Publishing, and Messaging-between-your-own-
  servers, not "inject a live command into a running server instance."

## The architecture actually used: authenticated polling

```
Roblox game server                          Backend
      |                                         |
      |--- GET /api/roblox/commands ----------->|  (every ~1.5s, X-Roblox-Api-Key header)
      |<-- signed batch of pending commands ----|
      |                                         |
      | verify signature, expiry, nonce        |
      | execute via CommandHandlers            |
      |                                         |
      |--- POST /api/roblox/ack --------------->|  (per-command result)
```

This is the standard, honest solution given the constraint above: Roblox
*pulls* from the backend instead of the backend pushing to Roblox. It is
implemented in `roblox/game/src/ServerScriptService/Services/CommandService.lua`
and `apps/backend/src/routes/roblox.ts` /
`apps/backend/src/roblox/robloxGateway.ts`.

Trade-off: there is up to `PollIntervalSeconds` (default 1.5s) of latency
between a command being queued and Roblox picking it up. For gift/like/
comment-driven gameplay effects this is imperceptible; if you need sub-
second latency, lower `PollIntervalSeconds` (at the cost of more requests)
rather than trying to force a push model Roblox doesn't support.

## Security on top of polling

See [SECURITY.md](./SECURITY.md) for the full threat model. Summary of what
Roblox itself verifies before executing anything:

1. **Transport**: use HTTPS in any non-local deployment (terminates at your
   reverse proxy/load balancer in front of the backend).
2. **API key** (`X-Roblox-Api-Key` header): rejected with 401 if missing/wrong.
3. **HMAC signature** over the exact JSON the backend signed
   (`SecurityService.verifyBatchSignature`) — defense-in-depth against
   anything sitting between Roblox and the backend, independent of TLS.
4. **Expiry** (`command.expiresAt`): commands older than
   `COMMAND_EXPIRY_SECONDS` are rejected, never executed.
5. **Nonce replay protection**: each command's `nonce` is remembered for 2
   minutes; a repeat is rejected.
6. **Roblox-side cooldown** (`CooldownService.lua`): a second, independent
   safety net beyond the backend's Rule Engine cooldowns.

## Studio setup

1. Install [Rojo](https://rojo.space/) (VS Code extension + Studio plugin,
   or the CLI).
2. From `roblox/game/`, run `rojo serve` and connect via the Studio plugin,
   or run `rojo build -o game.rbxlx` and open that file directly in Studio.
3. **Game Settings → Security → Allow HTTP Requests** must be ON, or every
   `HttpService:RequestAsync` call in `CommandService.lua` throws.
4. Edit `src/ServerScriptService/Security/Config.lua`:
   - `BackendBaseUrl`: `http://localhost:4000` for local testing.
   - `ApiKey`: must match `ROBLOX_API_KEY` in the backend's `.env` (or a key
     minted via the dashboard's Settings page / `POST /api/roblox/register`).
   - `CommandSigningSecret`: must match `ROBLOX_COMMAND_SIGNING_SECRET`.
5. Press Play. Output should show:
   `[LiveInteractive] Booting...` then
   `[LiveInteractive] Connected to backend at http://localhost:4000`.

## Studio debug mode

`Config.EnableDebugCommands` defaults to `RunService:IsStudio()` — true only
inside Studio, never in a published server. When true,
`ServerScriptService/Commands/DebugCommands.lua` lets you fire any handler
directly from the Command Bar without the backend running at all:

```lua
require(game.ServerScriptService.Commands.DebugCommands).Run("SPAWN_BOSS", { amount = 1 })
```

This module is only ever required when `EnableDebugCommands` is true — do
not change that default, and do not require `DebugCommands` unconditionally
from `Main.server.lua`.

## Project layout (Rojo mapping, see `default.project.json`)

```
ReplicatedStorage
  Shared/          -- CommandTypes.lua, Sha256.lua (pure-Luau SHA-256/HMAC; Roblox has no built-in crypto)
  Remotes/         -- RemoteEvents.lua: SERVER -> CLIENT only (visual/audio feedback), never client -> server commands
ServerScriptService
  Main/            -- Main.server.lua: the only Script; boots everything else
  Services/        -- CommandService (polling loop), SpawnService, PlayerService, WorldService, EventService, ItemService, CooldownService
  Commands/        -- CommandHandlers.lua (dispatch table), DebugCommands.lua (Studio-only)
  Security/        -- Config.lua (secrets), SecurityService.lua (signature/expiry/nonce checks)
ServerStorage
  NPCs/ Assets/ Items/   -- drop real models here; SpawnService/ItemService fall back to placeholders if empty
```

## Swapping placeholders for real content

`SpawnService.lua` looks for a Model/Part named after `enemyType`/`bossType`/
`npcType` under `ServerStorage.NPCs` first, and only creates a colored
placeholder block if nothing is found. Drop your own models in with matching
names and nothing else needs to change.
