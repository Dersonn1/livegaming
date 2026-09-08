--[[
	Development-only helper: lets you fire any command handler directly from
	the Studio Command Bar without needing the backend running, e.g.:

		require(game.ServerScriptService.Commands.DebugCommands).Run("SPAWN_BOSS", { amount = 1 })

	IMPORTANT: this module is only ever required by Main.server.lua when
	Config.EnableDebugCommands is true, which itself defaults to
	RunService:IsStudio() — so this code path never runs in a published,
	live game server. Do not change that default.
]]

local ServerScriptService = game:GetService("ServerScriptService")
local Handlers = require(ServerScriptService.Commands.CommandHandlers)

local DebugCommands = {}

function DebugCommands.Run(commandType: string, payload: { [string]: any }?)
	local handler = Handlers[commandType]
	if not handler then
		warn("[LiveInteractive][Debug] Unknown command type: " .. tostring(commandType))
		return
	end
	local ok, err = pcall(handler, payload or {})
	if ok then
		print("[LiveInteractive][Debug] Executed " .. commandType)
	else
		warn("[LiveInteractive][Debug] Error executing " .. commandType .. ": " .. tostring(err))
	end
end

return DebugCommands
