--[[
	Entry point. Roblox runs every Script under ServerScriptService
	automatically on server start — this is the only file that needs to be
	a Script (everything else is a ModuleScript required from here).
]]

local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Ensure the shared RemoteEvents exist before anything tries to use them.
require(ReplicatedStorage.Remotes.RemoteEvents)

local Config = require(ServerScriptService.Security.Config)
local CommandService = require(ServerScriptService.Services.CommandService)

print("[LiveInteractive] Booting...")

if Config.EnableDebugCommands then
	print("[LiveInteractive] Studio debug mode: DebugCommands.Run(type, payload) is available.")
end

CommandService.start()
