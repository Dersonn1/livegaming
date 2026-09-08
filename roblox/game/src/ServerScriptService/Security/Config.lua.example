--[[
	Roblox-side secrets and connection settings.

	This ModuleScript lives under ServerScriptService, which is NEVER
	replicated to clients — this is what makes it safe to hold secrets here
	(unlike anything under ReplicatedStorage, which every client can read).

	WHERE TO PUT REAL VALUES:
	  1. Quickest for local testing: paste them directly below, replacing the
	     placeholder strings. Do NOT commit real secrets if this repo is
	     pushed anywhere public — keep this file untracked/gitignored once
	     filled in, or better:
	  2. Recommended for anything beyond local testing: store them as
	     Roblox Studio "Game Settings > Security > HttpService" is unrelated;
	     instead use Studio's built-in secret storage via
	     `HttpService:GetSecret()` (Roblox Secrets, currently in beta) or an
	     external secret manager fetched once at server start via Open Cloud.
	     Until you wire that up, the inline values below are used directly.

	These MUST exactly match the corresponding values in the backend's .env:
	  BackendBaseUrl              -> not a secret, just where the backend runs
	  ApiKey                      -> ROBLOX_API_KEY (or a key from POST /api/roblox/register)
	  CommandSigningSecret        -> ROBLOX_COMMAND_SIGNING_SECRET
]]

return {
	-- Local dev default matches docker-compose / `npm run dev` on the backend.
	BackendBaseUrl = "http://localhost:4000",

	-- REPLACE with the same value as ROBLOX_API_KEY in your backend .env,
	-- or a key minted via POST /api/roblox/register from the dashboard.
	ApiKey = "dev-roblox-api-key-change-me",

	-- REPLACE with the same value as ROBLOX_COMMAND_SIGNING_SECRET in your
	-- backend .env. Used to verify command batches came from your backend.
	CommandSigningSecret = "dev-signing-secret-change-me",

	-- How often (seconds) the game server polls the backend for commands.
	PollIntervalSeconds = 1.5,

	-- Debug commands (see ServerScriptService/Commands/DebugCommands.lua)
	-- are only ever registered when this is true. Set to false (or simply
	-- remove the DebugCommands module) before publishing to production.
	EnableDebugCommands = game:GetService("RunService"):IsStudio(),
}
