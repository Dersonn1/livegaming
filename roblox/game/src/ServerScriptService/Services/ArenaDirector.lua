--[[
	Keeps the game alive even when nobody's LIVE chat is actively triggering
	events (e.g. the streamer stepped away, or the LIVE hasn't started yet):
	periodically spawns a few basic creatures on its own, and builds a
	simple bounded arena around the spawn point so players have a defined
	space to fight in instead of an open, edgeless baseplate.
]]

local CreatureFactory = require(script.Parent.CreatureFactory)

local ArenaDirector = {}

local ARENA_RADIUS = 60
local WALL_HEIGHT = 12

local AMBIENT_MIN_INTERVAL = 25
local AMBIENT_MAX_INTERVAL = 45
local AMBIENT_MIN_COUNT = 1
local AMBIENT_MAX_COUNT = 3

local function arenaCenter(): Vector3
	local spawn = workspace:FindFirstChild("SpawnLocation")
	return spawn and spawn.Position or Vector3.new(0, 5, 0)
end

local function randomPointInArena(): Vector3
	local center = arenaCenter()
	local angle = math.random() * math.pi * 2
	local radius = math.random() * (ARENA_RADIUS - 8)
	return center + Vector3.new(math.cos(angle) * radius, 5, math.sin(angle) * radius)
end

--- Builds a circular floor + wall ring with accent lighting so the arena
--- reads as an actual designed space instead of the default flat baseplate.
function ArenaDirector.buildArena()
	if workspace:FindFirstChild("ArenaWalls") then
		return -- already built for this server session
	end

	local center = arenaCenter()
	local folder = Instance.new("Folder")
	folder.Name = "ArenaWalls"
	folder.Parent = workspace

	-- Round floor (a squat cylinder), replacing the visual footprint of the
	-- default flat baseplate inside the arena bounds.
	local floor = Instance.new("Part")
	floor.Name = "ArenaFloor"
	floor.Shape = Enum.PartType.Cylinder
	floor.Size = Vector3.new(4, ARENA_RADIUS * 2, ARENA_RADIUS * 2)
	-- Thickness is 4 studs (the cylinder's local X, its "length" axis once
	-- rotated to lie flat below) so sinking the center by half of that puts
	-- the floor's TOP surface exactly at spawn height.
	floor.CFrame = CFrame.new(center - Vector3.new(0, 2, 0)) * CFrame.Angles(0, 0, math.rad(90))
	floor.Anchored = true
	floor.Color = Color3.fromRGB(90, 95, 105)
	floor.Material = Enum.Material.Slate
	floor.Parent = folder

	local segments = 24
	for i = 1, segments do
		local angle = (i / segments) * math.pi * 2
		local nextAngle = ((i + 1) / segments) * math.pi * 2
		local pos = center + Vector3.new(math.cos(angle) * ARENA_RADIUS, WALL_HEIGHT / 2, math.sin(angle) * ARENA_RADIUS)
		local nextPos = center + Vector3.new(math.cos(nextAngle) * ARENA_RADIUS, WALL_HEIGHT / 2, math.sin(nextAngle) * ARENA_RADIUS)
		local mid = (pos + nextPos) / 2
		local segmentLength = (nextPos - pos).Magnitude

		local wall = Instance.new("Part")
		wall.Name = "WallSegment"
		wall.Size = Vector3.new(segmentLength * 1.15, WALL_HEIGHT, 1.5)
		wall.Anchored = true
		wall.Color = Color3.fromRGB(55, 58, 68)
		wall.Material = Enum.Material.Basalt
		wall.CFrame = CFrame.new(mid, nextPos)
		wall.Parent = folder

		-- A glowing trim strip along the top of every other wall segment
		-- reads as intentional level design and doubles as ambient light.
		if i % 2 == 0 then
			local trim = Instance.new("Part")
			trim.Name = "WallTrim"
			trim.Size = Vector3.new(segmentLength * 1.15, 0.6, 1.7)
			trim.Anchored = true
			trim.Material = Enum.Material.Neon
			trim.Color = Color3.fromRGB(255, 140, 60)
			trim.CFrame = wall.CFrame * CFrame.new(0, WALL_HEIGHT / 2 + 0.3, 0)
			trim.Parent = folder

			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(255, 160, 90)
			light.Range = 20
			light.Brightness = 2
			light.Parent = trim
		end
	end
end

local BASIC_ENEMY_STATS = {
	name = "Ambient Enemy",
	health = 50,
	walkSpeed = 12,
	damage = 8,
	color = Color3.fromRGB(200, 40, 40),
	scale = 1,
	points = 5,
}

function ArenaDirector.startAmbientSpawning()
	task.spawn(function()
		while true do
			task.wait(math.random(AMBIENT_MIN_INTERVAL, AMBIENT_MAX_INTERVAL))
			local count = math.random(AMBIENT_MIN_COUNT, AMBIENT_MAX_COUNT)
			for _ = 1, count do
				CreatureFactory.spawn(BASIC_ENEMY_STATS, randomPointInArena())
			end
		end
	end)
end

return ArenaDirector
