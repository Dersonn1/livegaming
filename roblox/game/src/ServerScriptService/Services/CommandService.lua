--[[
	The Roblox side of the polling protocol described in docs/ROBLOX.md.

	Roblox cannot accept inbound connections (no WebSocket server, no HTTP
	server) — the only network primitive available to a live game server is
	OUTBOUND HttpService calls. So instead of the backend pushing to Roblox,
	Roblox pulls: every PollIntervalSeconds it calls
	GET /api/roblox/commands (authenticated with an API key), verifies the
	response, executes whatever commands came back, and POSTs the result to
	/api/roblox/ack. This file owns that whole loop.

	Remember to enable "Allow HTTP Requests" in Studio's Game Settings ->
	Security, otherwise every HttpService call below throws immediately.
]]

local HttpService = game:GetService("HttpService")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ServerScriptService.Security.Config)
local SecurityService = require(ServerScriptService.Security.SecurityService)
local CooldownService = require(ServerScriptService.Services.CooldownService)
local Handlers = require(ServerScriptService.Commands.CommandHandlers)

local RemoteEvents = require(game:GetService("ReplicatedStorage").Remotes.RemoteEvents)

local CommandService = {}

local running = false

local function request(method: string, path: string, body: string?)
	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = Config.BackendBaseUrl .. path,
			Method = method,
			Headers = {
				["Content-Type"] = "application/json",
				["X-Roblox-Api-Key"] = Config.ApiKey,
			},
			Body = body,
		})
	end)

	if not ok then
		warn("[LiveInteractive] HTTP request failed: " .. tostring(response))
		return nil
	end
	if not response.Success then
		warn(("[LiveInteractive] HTTP %s %s -> %d: %s"):format(method, path, response.StatusCode, response.Body))
		return nil
	end
	return response
end

local function ackCommand(commandId: string, status: string, errorMessage: string?)
	local payload = HttpService:JSONEncode({
		commandId = commandId,
		status = status,
		error = errorMessage,
		executedAt = DateTime.now():ToIsoDate(),
	})
	request("POST", "/api/roblox/ack", payload)
end

local function executeCommand(command)
	local handler = Handlers[command.type]
	if not handler then
		warn("[LiveInteractive] No handler registered for command type: " .. tostring(command.type))
		ackCommand(command.id, "REJECTED", "No handler for command type")
		return
	end

	if SecurityService.isExpired(command.expiresAt) then
		warn("[LiveInteractive] Rejected expired command: " .. command.type)
		ackCommand(command.id, "REJECTED", "Command expired")
		return
	end

	if not SecurityService.checkAndRecordNonce(command.nonce) then
		warn("[LiveInteractive] Rejected duplicate/replayed command nonce: " .. command.type)
		ackCommand(command.id, "REJECTED", "Duplicate nonce")
		return
	end

	if not CooldownService.tryFire(command.type) then
		-- Not an error: this is the Roblox-side anti-spam safety net silently
		-- absorbing a burst, exactly like the backend's rule cooldowns do.
		ackCommand(command.id, "REJECTED", "Roblox-side cooldown active")
		return
	end

	local ok, err = pcall(handler, command.payload or {})
	if ok then
		ackCommand(command.id, "SUCCESS")
		RemoteEvents.CommandExecuted:FireAllClients(command.type, command.payload)
	else
		warn(("[LiveInteractive] Command handler error (%s): %s"):format(command.type, tostring(err)))
		ackCommand(command.id, "FAILED", tostring(err))
	end
end

local function pollOnce()
	local response = request("GET", "/api/roblox/commands")
	if not response then
		return
	end

	local ok, envelope = pcall(HttpService.JSONDecode, HttpService, response.Body)
	if not ok then
		warn("[LiveInteractive] Malformed poll response, ignoring.")
		return
	end

	if not SecurityService.verifyBatchSignature(envelope.signedPayload, envelope.signature) then
		warn("[LiveInteractive] SECURITY: command batch signature verification FAILED. Ignoring entire batch.")
		return
	end

	for _, command in ipairs(envelope.commands or {}) do
		executeCommand(command)
	end
end

function CommandService.start()
	if running then
		return
	end
	running = true

	task.spawn(function()
		print("[LiveInteractive] Connected to backend at " .. Config.BackendBaseUrl)
		while running do
			local ok, err = pcall(pollOnce)
			if not ok then
				warn("[LiveInteractive] Poll loop error: " .. tostring(err))
			end
			task.wait(Config.PollIntervalSeconds)
		end
	end)
end

function CommandService.stop()
	running = false
end

return CommandService
