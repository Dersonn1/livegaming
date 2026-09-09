--[[
	Creates the physical models for spawn-type commands. Enemies/bosses/NPCs
	are real, functional creatures (health, AI via AIService, killable by
	WeaponService) built by CreatureFactory — not decorative placeholders.
	Drop a real Model under ServerStorage/NPCs (see its README) named after
	the enemyType/bossType/npcType and this clones that instead once you
	have real art content; until then, CreatureFactory's simple blocky
	creatures are fully playable on their own.
]]

local Workspace = game:GetService("Workspace")
local ServerStorage = game:GetService("ServerStorage")
local Debris = game:GetService("Debris")
local CreatureFactory = require(script.Parent.CreatureFactory)

local SpawnService = {}

local function randomSpawnPosition(): Vector3
	local spawnLocations = Workspace:FindFirstChild("SpawnLocation")
	local origin = spawnLocations and spawnLocations.Position or Vector3.new(0, 10, 0)
	return origin + Vector3.new(math.random(-30, 30), 5, math.random(-30, 30))
end

--- Clones a real ServerStorage/NPCs/<name> model if present, positioning it like a creature would be.
local function cloneStoredTemplate(storageFolder: Folder, name: string): Instance?
	local template = storageFolder:FindFirstChild(name)
	if not template then
		return nil
	end
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

function SpawnService.spawnEnemy(enemyType: string, amount: number)
	for _ = 1, amount do
		if not cloneStoredTemplate(ServerStorage.NPCs, enemyType) then
			CreatureFactory.spawn({
				name = enemyType,
				health = 50,
				walkSpeed = 14,
				damage = 8,
				color = Color3.fromRGB(200, 40, 40),
				scale = 1,
				points = 5,
			}, randomSpawnPosition())
		end
	end
end

function SpawnService.spawnBoss(bossType: string, amount: number)
	for _ = 1, amount do
		if not cloneStoredTemplate(ServerStorage.NPCs, bossType) then
			CreatureFactory.spawn({
				name = bossType,
				health = 500,
				walkSpeed = 10,
				damage = 20,
				color = Color3.fromRGB(120, 0, 160),
				scale = 2.5,
				points = 100,
			}, randomSpawnPosition())
		end
	end
end

function SpawnService.spawnNpc(npcType: string, amount: number)
	for _ = 1, amount do
		if not cloneStoredTemplate(ServerStorage.NPCs, npcType) then
			CreatureFactory.spawn({
				name = npcType,
				health = 30,
				walkSpeed = 10,
				damage = 0, -- friendly NPCs don't attack players
				color = Color3.fromRGB(80, 160, 220),
				scale = 1,
				points = 1,
			}, randomSpawnPosition())
		end
	end
end

--- Meteors actually explode on impact (Roblox's Explosion class damages nearby
--- Humanoids natively) instead of just falling through as a visual effect.
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

			local fire = Instance.new("Fire")
			fire.Size = 10
			fire.Heat = 12
			fire.Color = Color3.fromRGB(255, 170, 60)
			fire.SecondaryColor = Color3.fromRGB(255, 80, 0)
			fire.Parent = meteor

			local trail = Instance.new("ParticleEmitter")
			trail.Color = ColorSequence.new(Color3.fromRGB(255, 200, 120), Color3.fromRGB(80, 80, 80))
			trail.Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 3),
				NumberSequenceKeypoint.new(1, 0),
			})
			trail.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.2),
				NumberSequenceKeypoint.new(1, 1),
			})
			trail.Lifetime = NumberRange.new(0.6, 1.2)
			trail.Rate = 60
			trail.Speed = NumberRange.new(0, 1)
			trail.Parent = meteor

			local bodyVelocity = Instance.new("BodyVelocity")
			bodyVelocity.Velocity = Vector3.new(0, -60, 0)
			bodyVelocity.MaxForce = Vector3.new(0, math.huge, 0)
			bodyVelocity.Parent = meteor

			local exploded = false
			local function detonate()
				if exploded then
					return
				end
				exploded = true
				local explosion = Instance.new("Explosion")
				explosion.Position = meteor.Position
				explosion.BlastRadius = 12
				explosion.BlastPressure = 200000
				explosion.Parent = Workspace
				meteor:Destroy()
			end

			meteor.Touched:Connect(detonate)
			Debris:AddItem(meteor, 8) -- detonates via Touched well before this; safety net only

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
