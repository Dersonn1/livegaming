--[[
	Mirrors packages/shared/src/commands.ts GameCommandType. Kept as a plain
	list (not an enum library) since Luau has no first-class enums; treated
	as the source of truth for "is this a known command type" checks.
]]
return {
	"SPAWN_ENEMY",
	"SPAWN_BOSS",
	"SPAWN_METEOR",
	"CHANGE_GRAVITY",
	"CHANGE_SPEED",
	"GIVE_ITEM",
	"REMOVE_ITEM",
	"HEAL_PLAYER",
	"DAMAGE_PLAYER",
	"TELEPORT_PLAYER",
	"START_EVENT",
	"END_EVENT",
	"CHANGE_WEATHER",
	"CHANGE_TIME",
	"SPAWN_NPC",
	"EXPLOSION",
	"FREEZE_PLAYERS",
	"UNFREEZE_PLAYERS",
}
