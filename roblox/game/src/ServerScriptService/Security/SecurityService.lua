--[[
	Validates every command batch received from the backend before a single
	command is allowed to reach CommandService's handlers. This is the
	Roblox-side half of the security contract described in docs/SECURITY.md:
	rejects commands that are unsigned/mis-signed, expired, or duplicates
	(replayed nonces).

	This module trusts nothing about the network response by default — HTTPS
	already authenticates the backend host, but the HMAC signature check adds
	defense-in-depth against payload tampering/logging/replay from anything
	sitting between the two ends.
]]

local Config = require(script.Parent.Config)
local Sha256 = require(game:GetService("ReplicatedStorage").Shared.Sha256)

local SecurityService = {}

local seenNonces: { [string]: number } = {}
local NONCE_MEMORY_SECONDS = 120

local function cleanupNonces()
	local now = os.time()
	for nonce, seenAt in pairs(seenNonces) do
		if now - seenAt > NONCE_MEMORY_SECONDS then
			seenNonces[nonce] = nil
		end
	end
end

--- Verifies the HMAC signature over the EXACT raw string the backend signed
--- (envelope.signedPayload), never a locally re-serialized version of the
--- parsed commands table — re-encoding could legitimately differ byte-for-
--- byte from the backend's JSON.stringify output and cause false negatives.
function SecurityService.verifyBatchSignature(signedPayload: string, signature: string): boolean
	local expected = Sha256.hmacSha256(Config.CommandSigningSecret, signedPayload)
	return expected == signature
end

--- Returns true (and records the nonce) the first time this nonce is seen;
--- returns false for every subsequent call with the same nonce (a replay).
function SecurityService.checkAndRecordNonce(nonce: string): boolean
	cleanupNonces()
	if seenNonces[nonce] then
		return false
	end
	seenNonces[nonce] = os.time()
	return true
end

--- ISO-8601 timestamp comparison against the current time; commands past
--- their expiresAt are rejected outright, per the anti-replay requirements.
function SecurityService.isExpired(expiresAtIso: string): boolean
	local ok, expiresAtUnix = pcall(function()
		return DateTime.fromIsoDate(expiresAtIso).UnixTimestampMillis
	end)
	if not ok then
		return true -- malformed timestamp -> treat as expired/invalid, fail closed
	end
	return DateTime.now().UnixTimestampMillis > expiresAtUnix
end

return SecurityService
