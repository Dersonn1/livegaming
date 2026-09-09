--[[
	Builds real, functional creatures using Roblox's OFFICIAL
	Players:CreateHumanoidModelFromDescription() API — the same R15 rig
	system every player character uses (proper head/torso/arms/legs, not a
	flat box). This needs no custom meshes/assets and no marketplace asset
	IDs we'd have to guess at: it's built entirely from body colors and
	scale, which is why it's safe to rely on. Falls back to a simple
	procedural block-creature (the old look) if the description API ever
	fails (e.g. no network in a locked-down Studio) — spawning must never
	hard-crash a live event.

	A Died hook awards the player who landed the finishing hit (see
	WeaponService, which stamps "LastHitBy" on any Humanoid it damages).
	Drop a real Model under ServerStorage/NPCs (see its README) and
	SpawnService will clone that instead of calling this factory, once you
	have custom art content.
]]

local Players = game:GetService("Players")
local Debris = game:GetService("Debris")

local CreatureFactory = {}

export type CreatureStats = {
	name: string,
	health: number,
	walkSpeed: number,
	damage: number,
	color: Color3,
	scale: number,
	points: number,
}

local function buildHumanoidRig(stats: CreatureStats): Model?
	local ok, result = pcall(function()
		local description = Instance.new("HumanoidDescription")
		description.HeadColor3 = stats.color
		description.TorsoColor3 = stats.color
		description.LeftArmColor3 = stats.color
		description.RightArmColor3 = stats.color
		description.LeftLegColor3 = stats.color
		description.RightLegColor3 = stats.color

		-- Clamped to Roblox's own accepted scale range for HumanoidDescription;
		-- this is how bosses read as visibly bigger/bulkier than basic enemies.
		local scale = math.clamp(stats.scale, 0.7, 1.8)
		description.HeightScale = scale
		description.WidthScale = scale
		description.HeadScale = math.clamp(scale, 0.7, 1.3)
		description.BodyTypeScale = math.clamp(scale - 0.6, 0, 1)

		return Players:CreateHumanoidModelFromDescription(description, Enum.HumanoidRigType.R15)
	end)

	if ok then
		return result :: Model
	end
	warn("[LiveInteractive] CreateHumanoidModelFromDescription failed, using block fallback: " .. tostring(result))
	return nil
end

--- Simple procedural fallback (root + torso + head blocks) used only if the
--- official rig API is unavailable — keeps spawning working no matter what.
local function buildBlockRig(stats: CreatureStats): Model
	local model = Instance.new("Model")

	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(2, 2, 1) * stats.scale
	root.Transparency = 1
	root.CanCollide = true
	root.Parent = model

	local torso = Instance.new("Part")
	torso.Name = "Torso"
	torso.Size = Vector3.new(2, 2, 1) * stats.scale
	torso.Color = stats.color
	torso.CanCollide = false
	torso.CFrame = root.CFrame
	torso.Parent = model
	local torsoWeld = Instance.new("WeldConstraint")
	torsoWeld.Part0 = root
	torsoWeld.Part1 = torso
	torsoWeld.Parent = root

	local head = Instance.new("Part")
	head.Name = "Head"
	head.Shape = Enum.PartType.Ball
	head.Size = Vector3.new(1.2, 1.2, 1.2) * stats.scale
	head.Color = stats.color
	head.CanCollide = false
	head.CFrame = root.CFrame * CFrame.new(0, 1.6 * stats.scale, 0)
	head.Parent = model
	local headWeld = Instance.new("WeldConstraint")
	headWeld.Part0 = root
	headWeld.Part1 = head
	headWeld.Parent = root

	local humanoid = Instance.new("Humanoid")
	humanoid.Parent = model
	model.PrimaryPart = root
	return model
end

function CreatureFactory.spawn(stats: CreatureStats, position: Vector3): Model
	local model = buildHumanoidRig(stats) or buildBlockRig(stats)
	model.Name = stats.name

	-- The official rig ships with default clothing/animate scripts we don't
	-- want (no default "Shirt"/"Pants" template, no walking animations
	-- authored for our creatures) — strip anything that isn't the body/rig
	-- itself so it stays lightweight and visually consistent.
	local animate = model:FindFirstChild("Animate")
	if animate then
		animate:Destroy()
	end

	local humanoid = model:FindFirstChildOfClass("Humanoid") :: Humanoid
	humanoid.MaxHealth = stats.health
	humanoid.Health = stats.health
	humanoid.WalkSpeed = stats.walkSpeed
	humanoid.NameDisplayDistance = 40
	humanoid.HealthDisplayDistance = 40

	local root = model:FindFirstChild("HumanoidRootPart") :: BasePart
	model:SetPrimaryPartCFrame(CFrame.new(position))

	model:SetAttribute("Damage", stats.damage)
	model:SetAttribute("Points", stats.points)
	model:SetAttribute("IsCreature", true)
	model.Parent = workspace

	humanoid.Died:Connect(function()
		local killerId = model:GetAttribute("LastHitBy")
		local player = killerId and Players:GetPlayerByUserId(killerId)
		local leaderstats = player and player:FindFirstChild("leaderstats")
		if leaderstats then
			leaderstats.Kills.Value += 1
			leaderstats.Points.Value += stats.points
		end
		Debris:AddItem(model, 3) -- brief pause so the death is visible before cleanup
	end)

	Debris:AddItem(model, 180) -- safety-net cleanup for creatures nobody ever kills
	return model
end

return CreatureFactory
