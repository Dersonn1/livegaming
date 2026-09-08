--[[
	Command dispatch table: GameCommandType (string) -> handler function.
	This is the Luau counterpart of apps/backend/src/commands/CommandHandler.ts
	— a Map/table lookup, not an if/elseif chain, so adding a new command
	type later is purely additive.

	Every handler receives the already-validated `payload` table from the
	backend (types/ranges were enforced server-side) and returns true/false
	to indicate success, which CommandService uses for the ack it POSTs
	back to /api/roblox/ack.
]]

local ServerScriptService = game:GetService("ServerScriptService")
local Services = ServerScriptService.Services

local SpawnService = require(Services.SpawnService)
local PlayerService = require(Services.PlayerService)
local WorldService = require(Services.WorldService)
local EventService = require(Services.EventService)
local ItemService = require(Services.ItemService)

local Handlers: { [string]: (payload: { [string]: any }) -> boolean } = {}

Handlers.SPAWN_ENEMY = function(payload)
	SpawnService.spawnEnemy(payload.enemyType or "basic", payload.amount or 1)
	return true
end

Handlers.SPAWN_BOSS = function(payload)
	SpawnService.spawnBoss(payload.bossType or "default", payload.amount or 1)
	return true
end

Handlers.SPAWN_METEOR = function(payload)
	SpawnService.meteorShower(payload.amount or 5, payload.durationSeconds or 10)
	return true
end

Handlers.SPAWN_NPC = function(payload)
	SpawnService.spawnNpc(payload.npcType or "villager", payload.amount or 1)
	return true
end

Handlers.EXPLOSION = function(payload)
	SpawnService.explosion(payload.radius or 10, payload.position or "random")
	return true
end

Handlers.CHANGE_GRAVITY = function(payload)
	WorldService.changeGravity(payload.value or 196.2, payload.durationSeconds or 30)
	return true
end

Handlers.CHANGE_SPEED = function(payload)
	WorldService.changeSpeed(payload.multiplier or 1.5, payload.durationSeconds or 30, PlayerService)
	return true
end

Handlers.CHANGE_WEATHER = function(payload)
	WorldService.changeWeather(payload.weather or "clear")
	return true
end

Handlers.CHANGE_TIME = function(payload)
	WorldService.changeTime(payload.clockTime or 12)
	return true
end

Handlers.HEAL_PLAYER = function(payload)
	PlayerService.healAll(payload.amount or 25)
	return true
end

Handlers.DAMAGE_PLAYER = function(payload)
	PlayerService.damageAll(payload.amount or 10)
	return true
end

Handlers.TELEPORT_PLAYER = function(payload)
	-- `destination` is a named spot for now (extend with a lookup table of
	-- Vector3s / real spawn markers as your map grows).
	PlayerService.teleportAll(Vector3.new(0, 10, 0))
	return true
end

Handlers.FREEZE_PLAYERS = function(payload)
	PlayerService.setAllFrozen(true)
	task.delay(payload.durationSeconds or 10, function()
		PlayerService.setAllFrozen(false)
	end)
	return true
end

Handlers.UNFREEZE_PLAYERS = function(_payload)
	PlayerService.setAllFrozen(false)
	return true
end

Handlers.GIVE_ITEM = function(payload)
	ItemService.giveItemToAll(payload.itemId or "unknown", payload.quantity or 1)
	return true
end

Handlers.REMOVE_ITEM = function(payload)
	ItemService.removeItemFromAll(payload.itemId or "unknown", payload.quantity or 1)
	return true
end

Handlers.START_EVENT = function(payload)
	EventService.startEvent(payload.eventName or "special_event")
	return true
end

Handlers.END_EVENT = function(payload)
	EventService.endEvent(payload.eventName or "special_event")
	return true
end

return Handlers
