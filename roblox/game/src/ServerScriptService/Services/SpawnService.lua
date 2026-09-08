--[[
	Creates the physical parts/models for spawn-type commands. Ships with
	simple procedurally-built placeholder parts (colored blocks) so the
	whole pipeline is testable with zero art assets. For a real game, drop
	your own models under ServerStorage/NPCs and ServerStorage/Assets and
	swap the `Instance.new("Part")` blocks below for `model:Clone()` calls —
	the rest of the command flow does not need to change.
]]

local Workspace = game:GetService("Workspace")
local ServerStorage = game:GetService("ServerStorage")
local Debris = game:GetService("Debris")

local SpawnService = {}

local function randomSpawnPosition(): Vector3
	local spawnLocations = Workspace:FindFirstChild("SpawnLocation")
	local origin = spawnLocations and spawnLocations.Position or Vector3.new(0, 10, 0)
	return origin + Vector3.new(math.random(-30, 30), 5, math.random(-30, 30))
end

local function makePlaceholderPart(name: string, size: Vector3, color: Color3): BasePart
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Anchored = false
	part.CanCollide = true
	part.Shape = Enum.PartType.Block
	part.Position = randomSpawnPosition()
	part.Parent = Workspace
	Debris:AddItem(part, 120) -- safety-net cleanup so test spawns never pile up forever
	return part
end

--- Tries ServerStorage/NPCs/<name> first (real game content); falls back to a placeholder block.
local function spawnFromStorageOrPlaceholder(storageFolder: Folder, name: string, color: Color3): Instance
	local template = storageFolder:FindFirstChild(name)
	if template then
		local clone = template:Clone()
		if clone:IsA("Model") and clone.PrimaryPart then
			clone:SetPrimaryPartCFrame(CFrame.new(randomSpawnPosition()))
		elseif clone:IsA("BasePart") then
			clone.Position = randomSpawnPosition()
		end
		clone.Parent = Workspace
		Debris:AddItem(clone, 180)
		return clone
	end
	return makePlaceholderPart(name, Vector3.new(4, 6, 4), color)
end

function SpawnService.spawnEnemy(enemyType: string, amount: number)
	local npcs = ServerStorage.NPCs
	for _ = 1, amount do
		spawnFromStorageOrPlaceholder(npcs, enemyType, Color3.fromRGB(200, 40, 40))
	end
end

function SpawnService.spawnBoss(bossType: string, amount: number)
	local npcs = ServerStorage.NPCs
	for _ = 1, amount do
		local boss = spawnFromStorageOrPlaceholder(npcs, bossType, Color3.fromRGB(120, 0, 160))
		if boss:IsA("BasePart") then
			boss.Size = Vector3.new(10, 14, 10) -- bosses are visually distinct even as placeholders
		end
	end
end

function SpawnService.spawnNpc(npcType: string, amount: number)
	local npcs = ServerStorage.NPCs
	for _ = 1, amount do
		spawnFromStorageOrPlaceholder(npcs, npcType, Color3.fromRGB(80, 160, 220))
	end
end

function SpawnService.meteorShower(amount: number, durationSeconds: number)
	local interval = durationSeconds / math.max(amount, 1)

	task.spawn(function()
		for _ = 1, amount do
			local meteor = Instance.new("Part")
			meteor.Name = "Meteor"
			meteor.Shape = Enum.PartType.Ball
			meteor.Size = Vector3.new(6, 6, 6)
			meteor.Color = Color3.fromRGB(255, 100, 0)
			meteor.Material = Enum.Material.Neon
			meteor.Position = randomSpawnPosition() + Vector3.new(0, 80, 0)
			meteor.Parent = Workspace
			Debris:AddItem(meteor, 15)

			local bodyVelocity = Instance.new("BodyVelocity")
			bodyVelocity.Velocity = Vector3.new(0, -60, 0)
			bodyVelocity.MaxForce = Vector3.new(0, math.huge, 0)
			bodyVelocity.Parent = meteor

			task.wait(interval)
		end
	end)
end

function SpawnService.explosion(radius: number, _position: string)
	-- `_position` is reserved for named spawn markers in a real map; the
	-- MVP always uses a random point near the configured SpawnLocation.
	local origin = randomSpawnPosition()
	local explosion = Instance.new("Explosion")
	explosion.Position = origin
	explosion.BlastRadius = radius
	explosion.BlastPressure = 500000
	explosion.Parent = Workspace
end

return SpawnService
