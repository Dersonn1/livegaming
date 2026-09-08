--[[
	Final safety-net cooldown, applied INSIDE Roblox regardless of whatever
	cooldown the Rule Engine already enforced on the backend. This protects
	the game server even if: a dashboard operator fires "Test Command"
	rapidly, multiple rules with independent cooldowns target the same
	command type, or a bug ever lets more through than intended upstream.
]]

local CooldownService = {}

local lastFiredAt: { [string]: number } = {}

local DEFAULT_COOLDOWNS: { [string]: number } = {
	SPAWN_ENEMY = 1,
	SPAWN_BOSS = 20,
	SPAWN_METEOR = 20,
	CHANGE_GRAVITY = 5,
	CHANGE_SPEED = 5,
	GIVE_ITEM = 0.5,
	REMOVE_ITEM = 0.5,
	HEAL_PLAYER = 1,
	DAMAGE_PLAYER = 1,
	TELEPORT_PLAYER = 2,
	START_EVENT = 3,
	END_EVENT = 0,
	CHANGE_WEATHER = 3,
	CHANGE_TIME = 3,
	SPAWN_NPC = 3,
	EXPLOSION = 3,
	FREEZE_PLAYERS = 10,
	UNFREEZE_PLAYERS = 0,
}

--- Returns true if `commandType` may execute right now, and records the fire time if so.
function CooldownService.tryFire(commandType: string): boolean
	local cooldown = DEFAULT_COOLDOWNS[commandType] or 1
	local now = os.clock()
	local last = lastFiredAt[commandType]
	if last and (now - last) < cooldown then
		return false
	end
	lastFiredAt[commandType] = now
	return true
end

return CooldownService
