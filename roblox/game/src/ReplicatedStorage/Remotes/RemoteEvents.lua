--[[
	Server -> client RemoteEvents used purely for VISUAL/AUDIO feedback
	(effects, notifications). No RemoteEvent here ever lets a client send a
	game command upstream — that direction does not exist. All gameplay
	commands originate exclusively from CommandService on the server, which
	itself only trusts commands that arrived via the authenticated Roblox
	Gateway poll (see ServerScriptService/Services/CommandService.lua and
	ServerScriptService/Security/SecurityService.lua).

	This ModuleScript should be run once from a server Script to create the
	RemoteEvent instances under itself, then required by both server
	(to :FireAllClients) and client (to listen).
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remotesFolder = script.Parent

local EVENT_NAMES = {
	"CommandExecuted", -- (commandType: string, payload: table) fired after any successful command, for client-side effects
	"LiveEventNotification", -- (username: string, eventType: string) fired for on-screen toast notifications
}

local Remotes = {}

for _, name in ipairs(EVENT_NAMES) do
	local existing = remotesFolder:FindFirstChild(name)
	if existing then
		Remotes[name] = existing
	else
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = remotesFolder
		Remotes[name] = remote
	end
end

return Remotes
