--[[
	Entry point. Roblox runs every Script under ServerScriptService
	automatically on server start — this is the only file that needs to be
	a Script (everything else is a ModuleScript required from here).
]]

local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

-- Ensure the shared RemoteEvents exist before anything tries to use them.
require(ReplicatedStorage.Remotes.RemoteEvents)

local Config = require(ServerScriptService.Security.Config)
local CommandService = require(ServerScriptService.Services.CommandService)
local PlayerService = require(ServerScriptService.Services.PlayerService)
local WeaponService = require(ServerScriptService.Services.WeaponService)
local AIService = require(ServerScriptService.Services.AIService)
local ArenaDirector = require(ServerScriptService.Services.ArenaDirector)

print("[LiveInteractive] Booting...")

if Config.EnableDebugCommands then
	print("[LiveInteractive] Studio debug mode: DebugCommands.Run(type, payload) is available.")
end

-- Core gameplay: every player gets leaderstats + a weapon, creatures have
-- real AI, and the arena keeps itself populated even with no LIVE events
-- flowing — so there's always something for viewers-as-players to do.
Players.PlayerAdded:Connect(function(player)
	PlayerService.setupLeaderstats(player)
	player.CharacterAdded:Connect(function()
		WeaponService.giveTo(player)
	end)
end)

ArenaDirector.buildArena()
ArenaDirector.startAmbientSpawning()
AIService.start()

CommandService.start()
